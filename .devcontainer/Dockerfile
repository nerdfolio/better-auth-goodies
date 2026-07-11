FROM mcr.microsoft.com/devcontainers/typescript-node:24

# python3 is required directly (not via uv) by the PreToolUse hook scripts in .claude/settings.json
# playwright's install-deps needs apt/root, so do it before dropping to the "node" user below
RUN apt-get update && apt-get install -y --no-install-recommends python3 ripgrep iptables ipset dnsutils jq \
	&& rm -rf /var/lib/apt/lists/* \
	&& npx --yes playwright@latest install-deps chromium \
  && npm uninstall -g pnpm && corepack enable pnpm

# Single runtime authority for the pnpm store path (must match the pnpm-store volume
# target in docker-compose.yml); pnpm reads npm_config_store_dir directly
ENV npm_config_store_dir=/pnpm/store

# Pre-create the volume mount points owned by node so fresh named volumes inherit
# correct ownership on first mount (postCreate keeps a non-recursive chown as a safety net)
RUN install -d -o node -g node /workspace/node_modules "$npm_config_store_dir"

# typescript-language-server: powers Serena's TypeScript/JavaScript code intelligence
# @anthropic-ai/claude-code: the CLI itself, so `claude` is available inside the container
RUN npm install -g typescript-language-server @anthropic-ai/claude-code

USER node

# uv installs and runs isolated Python tooling while the system python3 remains available
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/home/node/.local/bin:${PATH}"

# serena-agent -> `serena` (code-navigation MCP server) + `serena-hooks` (used by .claude/settings.json hooks)
# graphifyy    -> `graphify` (knowledge-graph CLI) + `graphify-mcp`
RUN uv tool install serena-agent && uv tool install graphifyy && graphify install

# Pre-download Chromium into the node user's cache so the Playwright MCP server works immediately.
# Install via @playwright/mcp's own bundled playwright-core (not stable playwright@latest) so the
# browser revision matches what the MCP expects — stable lags the MCP's alpha core (e.g. 1228 vs 1232).
# Also warms the npx cache for the MCP itself.
RUN npx --yes --package=@playwright/mcp@latest -- playwright-core install chromium

# Tolerate flaky/slow registry connections during postCreate's pnpm install: one timed-out
# tarball otherwise aborts the whole provisioning chain (pnpm reads npm_config_* directly).
# Runtime-only setting, so kept late to avoid busting the expensive layer cache above.
ENV npm_config_fetch_retries=5 npm_config_fetch_timeout=120000 npm_config_fetch_retry_maxtimeout=120000

# Egress firewall script: root-owned so the node user (and any agent) can't modify the copy
# the scoped sudoers rule points at. Kept as the last layer so allowlist edits rebuild in seconds.
COPY --chmod=755 .devcontainer/init-firewall.sh /usr/local/bin/init-firewall.sh
