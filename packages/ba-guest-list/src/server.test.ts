import { betterAuth } from "better-auth"
import { type MemoryDB, memoryAdapter } from "better-auth/adapters/memory"
import { APIError } from "better-auth/api"
import { beforeEach, describe, expect, it } from "vitest"
import { type GuestListOptions, guestList } from "./server"

function createDb(): MemoryDB {
	return { user: [], session: [], account: [], verification: [] }
}

function createTestAuth(options: GuestListOptions, baseURL = "http://localhost:3000") {
	const db = createDb()
	const auth = betterAuth({
		baseURL,
		secret: "test-secret-at-least-32-chars-long!!",
		logger: { disabled: true },
		database: memoryAdapter(db),
		user: {
			additionalFields: {
				role: { type: "string", required: false },
			},
		},
		plugins: [guestList(options)],
	})
	return { db, auth }
}

type TestAuth = ReturnType<typeof createTestAuth>

async function signInGuest(auth: TestAuth["auth"], name: string) {
	const result = await auth.api.signInGuestList({ body: { name } })
	if (!result) throw new Error("expected sign-in to return a token and user")
	return result
}

describe("guestList", () => {
	describe("successful sign-in", () => {
		let db: MemoryDB
		let auth: TestAuth["auth"]

		beforeEach(() => {
			const setup = createTestAuth({ allowGuests: ["alice", "bob"] })
			db = setup.db
			auth = setup.auth
		})

		it("returns a token and user for a name on the guest list", async () => {
			const result = await signInGuest(auth, "alice")

			expect(result).toHaveProperty("token")
			expect(typeof result.token).toBe("string")
			expect(result.user).toBeTruthy()
			expect(result.user.name).toBe("Alice")
		})

		it("generates an email based on the lowercased name and the baseURL domain", async () => {
			const result = await signInGuest(auth, "alice")

			expect(result.user.email).toBe("alice.onguestlist@localhost.example.com")
		})

		it("matches guest names case-insensitively", async () => {
			const result = await signInGuest(auth, "ALICE")

			expect(result.user.name).toBe("Alice")
			expect(result.user.email).toBe("alice.onguestlist@localhost.example.com")
		})

		it("reuses the existing user when signing in again with the same name", async () => {
			const first = await signInGuest(auth, "alice")
			const second = await signInGuest(auth, "alice")

			expect(second.user.id).toBe(first.user.id)
			expect(db.user.length).toBe(1)
		})

		it("reuses the existing user across differently-cased sign-ins", async () => {
			const first = await signInGuest(auth, "alice")
			const second = await signInGuest(auth, "Alice")

			expect(second.user.id).toBe(first.user.id)
			expect(db.user.length).toBe(1)
		})

		it("creates separate users for different guest names", async () => {
			await auth.api.signInGuestList({ body: { name: "alice" } })
			await auth.api.signInGuestList({ body: { name: "bob" } })

			expect(db.user.length).toBe(2)
		})
	})

	describe("rejection cases", () => {
		let auth: TestAuth["auth"]

		beforeEach(() => {
			auth = createTestAuth({ allowGuests: ["alice", "bob"] }).auth
		})

		it("throws UNAUTHORIZED with 'Guest name not provided' for an empty name", async () => {
			await expect(auth.api.signInGuestList({ body: { name: "" } })).rejects.toMatchObject({
				status: "UNAUTHORIZED",
				body: { message: "Guest name not provided" },
			})
		})

		it("throws UNAUTHORIZED for a multi-word name", async () => {
			await expect(auth.api.signInGuestList({ body: { name: "mary ann" } })).rejects.toMatchObject({
				status: "UNAUTHORIZED",
				body: { message: "Please only use 1-word names" },
			})
		})

		it("throws UNAUTHORIZED with 'Your name is not on the guest list' for an unknown name", async () => {
			await expect(auth.api.signInGuestList({ body: { name: "charlie" } })).rejects.toMatchObject({
				status: "UNAUTHORIZED",
				body: { message: "Your name is not on the guest list" },
			})
		})
	})

	describe("revealNames: false (default)", () => {
		let auth: TestAuth["auth"]

		beforeEach(() => {
			auth = createTestAuth({ allowGuests: ["alice", "bob"] }).auth
		})

		it("does not list guest names in the empty-name error message", async () => {
			try {
				await auth.api.signInGuestList({ body: { name: "" } })
				expect.unreachable("expected signInGuestList to throw")
			} catch (error) {
				expect(error).toBeInstanceOf(APIError)
				expect((error as APIError).body?.message).toBe("Guest name not provided")
			}
		})

		it("does not list guest names in the not-on-list error message", async () => {
			try {
				await auth.api.signInGuestList({ body: { name: "charlie" } })
				expect.unreachable("expected signInGuestList to throw")
			} catch (error) {
				expect(error).toBeInstanceOf(APIError)
				expect((error as APIError).body?.message).toBe("Your name is not on the guest list")
			}
		})

		it("reveal endpoint returns an empty array", async () => {
			const result = await auth.api.revealGuestList()
			expect(result).toEqual([])
		})
	})

	describe("revealNames: true", () => {
		let auth: TestAuth["auth"]

		beforeEach(() => {
			auth = createTestAuth({ allowGuests: ["alice", "bob"], revealNames: true }).auth
		})

		it("lists guest names in the empty-name error message", async () => {
			try {
				await auth.api.signInGuestList({ body: { name: "" } })
				expect.unreachable("expected signInGuestList to throw")
			} catch (error) {
				expect(error).toBeInstanceOf(APIError)
				const message = (error as APIError).body?.message ?? ""
				expect(message).toContain("Alice")
				expect(message).toContain("Bob")
			}
		})

		it("lists guest names in the not-on-list error message", async () => {
			try {
				await auth.api.signInGuestList({ body: { name: "charlie" } })
				expect.unreachable("expected signInGuestList to throw")
			} catch (error) {
				expect(error).toBeInstanceOf(APIError)
				const message = (error as APIError).body?.message ?? ""
				expect(message).toContain("Alice")
				expect(message).toContain("Bob")
			}
		})

		it("reveal endpoint returns the formatted guest names", async () => {
			const result = await auth.api.revealGuestList()
			expect(result).toEqual(["Alice", "Bob"])
		})
	})

	describe("roles", () => {
		it("assigns the default role 'user' when none is specified", async () => {
			const { db, auth } = createTestAuth({ allowGuests: ["alice"] })

			const result = await signInGuest(auth, "alice")

			expect(result.user).toMatchObject({ role: "user" })
			expect(db.user[0]?.role).toBe("user")
		})

		it("assigns an explicit role from a GuestWithRole entry", async () => {
			const { db, auth } = createTestAuth({ allowGuests: [{ name: "alice", role: "admin" }] })

			const result = await signInGuest(auth, "alice")

			expect(result.user).toMatchObject({ role: "admin" })
			expect(db.user[0]?.role).toBe("admin")
		})

		it("trims whitespace around comma-separated roles", async () => {
			const { db, auth } = createTestAuth({ allowGuests: [{ name: "alice", role: "admin, editor" }] })

			const result = await signInGuest(auth, "alice")

			expect(result.user).toMatchObject({ role: "admin,editor" })
			expect(db.user[0]?.role).toBe("admin,editor")
		})

		it("uses options.defaultRole when a guest entry omits a role", async () => {
			const { db, auth } = createTestAuth({ allowGuests: [{ name: "alice" }], defaultRole: "editor" })

			const result = await signInGuest(auth, "alice")

			expect(result.user).toMatchObject({ role: "editor" })
			expect(db.user[0]?.role).toBe("editor")
		})
	})

	describe("emailDomainName option", () => {
		it("overrides the baseURL-derived domain when provided", async () => {
			const { auth } = createTestAuth({ allowGuests: ["alice"], emailDomainName: "custom.example.org" })

			const result = await signInGuest(auth, "alice")

			expect(result.user.email).toBe("alice.onguestlist@custom.example.org")
		})

		it("falls back to parseEmailDomain(baseURL) when not provided", async () => {
			const { auth } = createTestAuth({ allowGuests: ["alice"] }, "http://my-app.test:4000")

			const result = await signInGuest(auth, "alice")

			expect(result.user.email).toBe("alice.onguestlist@my-app.test")
		})
	})

	describe("$ERROR_CODES", () => {
		it("exposes the plugin's error codes", () => {
			const plugin = guestList({ allowGuests: ["alice"] })

			expect(plugin.$ERROR_CODES).toBeTruthy()
			expect(plugin.$ERROR_CODES.NAME_NOT_PROVIDED).toBeTruthy()
			expect(plugin.$ERROR_CODES.NAME_NOT_ON_GUEST_LIST).toBeTruthy()
			expect(plugin.$ERROR_CODES.NAME_ONE_WORD_ONLY).toBeTruthy()
		})
	})
})
