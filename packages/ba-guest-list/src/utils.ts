import { capitalize } from "lodash-es"

export function parseEmailDomain(url: string) {
	try {
		const { hostname } = new URL(url)
		if (hostname === 'localhost') {
			// email domain foo@localhost would fail format validation for some overly strict backends.
			// It doesn't hurt to morph it here since this is dev-only
			return 'localhost.example.com'
		}
		return hostname
	} catch (_error) {
		return null
	}
}

export function formatName(name: string) {
	return capitalize(name.replaceAll(/\s/g, ""))
}