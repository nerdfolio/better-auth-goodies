import { capitalize } from "lodash-es"

export function getOrigin(url: string) {
	try {
		const parsedUrl = new URL(url)
		return parsedUrl.origin
	} catch (_error) {
		return null
	}
}

export function formatName(name: string) {
	return capitalize(name.replaceAll(/\s/g, ""))
}