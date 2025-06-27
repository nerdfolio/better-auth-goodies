import { capitalize } from "lodash-es"

export function getHostName(url: string) {
	try {
		const parsedUrl = new URL(url)
		return parsedUrl.hostname
	} catch (_error) {
		return null
	}
}

export function formatName(name: string) {
	return capitalize(name.replaceAll(/\s/g, ""))
}