import { describe, expect, it } from "vitest"
import { guestListClient } from "./client"

describe("guestListClient", () => {
	it("returns a client plugin with id 'guest-list'", () => {
		const plugin = guestListClient()
		expect(plugin.id).toBe("guest-list")
	})

	it("exposes $InferServerPlugin for type inference", () => {
		const plugin = guestListClient()
		expect(plugin).toHaveProperty("$InferServerPlugin")
	})
})
