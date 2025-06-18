export function getOrigin(url: string) {
	try {
		const parsedUrl = new URL(url)
		return parsedUrl.origin
	} catch (_error) {
		return null
	}
}