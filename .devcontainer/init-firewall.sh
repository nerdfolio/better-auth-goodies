#!/bin/bash
# Default-deny egress firewall. Runs at every container start (postStartCommand).
# To allow a new destination: add the domain below, then `sudo /usr/local/bin/init-firewall.sh`.
# NOTE: edits to this workspace copy take effect only at the next image rebuild;
# the running container uses the root-owned copy baked into the image at /usr/local/bin.
set -euo pipefail
IFS=$'\n\t'

ALLOWED_DOMAINS=(
	# Claude Code core
	api.anthropic.com
	claude.ai
	console.anthropic.com
	code.claude.com
	# Claude Code telemetry / error reporting
	statsig.anthropic.com
	statsig.com
	sentry.io
	# packages
	registry.npmjs.org
	# docs / MCP
	developer.mozilla.org
	context7.com
	mcp.context7.com
	# VS Code remote server + extension marketplace
	update.code.visualstudio.com
	marketplace.visualstudio.com
	vscode.blob.core.windows.net
	vscode.download.prss.microsoft.com # CDN serving the VS Code server tarball
)

# Fetch GitHub CIDRs (git/api/web) while egress is still open
gh_ranges=$(curl -fsSL --max-time 10 https://api.github.com/meta || true)

# Reset any previous run
iptables -P OUTPUT ACCEPT
iptables -F OUTPUT
ipset destroy allowed-domains 2>/dev/null || true
ipset create allowed-domains hash:net

for domain in "${ALLOWED_DOMAINS[@]}"; do
	ips=$(dig +short A "$domain" | grep -E '^[0-9.]+' || true)
	[ -z "$ips" ] && { echo "WARN: cannot resolve $domain" >&2; continue; }
	for ip in $ips; do ipset add allowed-domains "$ip" -exist; done
done

if [ -n "$gh_ranges" ]; then
	echo "$gh_ranges" | jq -r '(.git + .api + .web)[]' | grep -v ':' \
		| while read -r cidr; do ipset add allowed-domains "$cidr" -exist; done
fi

iptables -A OUTPUT -o lo -j ACCEPT                                # loopback (incl. Docker embedded DNS)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT                    # DNS (residual tunneling risk accepted)
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT # replies to inbound (VS Code port forwards)
DOCKER_NET=$(ip route | awk '/proto kernel/ {print $1}' | head -1)
[ -n "$DOCKER_NET" ] && iptables -A OUTPUT -d "$DOCKER_NET" -j ACCEPT # compose network / host gateway
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-port-unreachable  # fast-fail everything else
iptables -P OUTPUT DROP                                           # backstop

# Verify: known-bad must fail, known-good must connect
curl -fsS --max-time 5 https://example.com >/dev/null 2>&1 \
	&& { echo "VERIFY FAILED: example.com still reachable" >&2; exit 1; }
curl -s --max-time 10 https://api.anthropic.com >/dev/null 2>&1 \
	|| { echo "VERIFY FAILED: api.anthropic.com unreachable" >&2; exit 1; }
echo "Egress firewall active."
