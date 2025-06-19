import { capitalize } from "lodash-es"

export function getHost(url: string) {
	try {
		const parsedUrl = new URL(url)
		return parsedUrl.host
	} catch (_error) {
		return null
	}
}

export function formatName(name: string) {
	return capitalize(name.replaceAll(/\s/g, ""))
}