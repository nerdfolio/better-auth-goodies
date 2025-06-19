import type { BetterAuthClientPlugin } from "better-auth"
import type { guestList } from "./server"

export const guestListClient = () => {
	return {
		id: "guest-list",
		$InferServerPlugin: {} as ReturnType<typeof guestList>,
	} satisfies BetterAuthClientPlugin
}