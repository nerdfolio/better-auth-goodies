import { type BetterAuthPlugin, defineErrorCodes } from "better-auth"
import { APIError, createAuthEndpoint } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import * as z from "zod/mini"
import { formatName, parseEmailDomain } from "./utils"

type GuestWithRole = {
	name: string
	/**
	 * Comma-separated roles. Falls back to `defaultRole` when omitted or empty.
	 */
	role?: string
}

export interface GuestListOptions {
	/**
	 * List of accepted guest names
	 */
	allowGuests: string[] | GuestWithRole[]

	/**
	 * When true returns the list of guest names via the guestList.reveal() endpoint and via errors.
	 * When false returns nothing.
	 * @default false
	 */
	revealNames?: boolean

	/**
	 * Role assigned to guests that don't specify one on the guest list.
	 * Only persisted if the app declares a `role` field on the user model
	 * (e.g. via the admin plugin or `user.additionalFields`).
	 * @default "user"
	 */
	defaultRole?: string

	/**
	 * Configure the domain name of the temporary email
	 * address for the guest users in the database.
	 * @default "baseURL"
	 */
	emailDomainName?: string
}

export const guestList = (options?: GuestListOptions) => {
	const ERROR_CODES = defineErrorCodes({
		NAME_NOT_PROVIDED: "Guest name not provided",
		NAME_NOT_ON_GUEST_LIST: "Your name is not on the guest list",
		NAME_ONE_WORD_ONLY: "Please only use 1-word names",
		FAILED_TO_CREATE_USER: "Failed to create user",
		COULD_NOT_CREATE_SESSION: "Could not create session",
	})

	const defaultRole = options?.defaultRole ?? "user"

	const guestLookup = Object.fromEntries(
		(options?.allowGuests ?? [])
			.map((entry) => (typeof entry === "string" ? { name: entry, role: defaultRole } : entry))
			.filter((entry) => !!entry && entry.name)
			.map(({ name, role }) => [
				formatName(name),
				{
					name: formatName(name),
					role: (role || defaultRole)
						.split(",")
						.map((s) => s.trim())
						.join(","),
				},
			])
	)

	return {
		id: "guest-list",
		endpoints: {
			signInGuestList: createAuthEndpoint(
				"/sign-in/guest-list",
				{
					method: "POST",
					body: z.object({
						name: z.string(),
					}),
					metadata: {
						openapi: {
							description: "Sign in via a guest list",
							responses: {
								200: {
									description: "Sign in as a guest successful",
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													token: {
														type: "string",
														description: "Session token for the authenticated session",
													},
													user: {
														$ref: "#/components/schemas/User",
													},
												},
												required: ["token", "user"],
											},
										},
									},
								},
							},
						},
					},
				},
				async (ctx) => {
					const { name } = ctx.body

					if (!name) {
						ctx.context.logger.error("Guest name not provided")
						throw options?.revealNames
							? new APIError("UNAUTHORIZED", {
									message: `Guest name not provided. Try: ${JSON.stringify(Object.keys(guestLookup))}`,
								})
							: APIError.from("UNAUTHORIZED", ERROR_CODES.NAME_NOT_PROVIDED)
					}

					if (name.trim().split(/\s+/).length > 1) {
						ctx.context.logger.error("For simplicity, only one word names are allowed")
						throw APIError.from("UNAUTHORIZED", ERROR_CODES.NAME_ONE_WORD_ONLY)
					}

					const cleanedName = formatName(name)

					if (!guestLookup[cleanedName]) {
						throw options?.revealNames
							? new APIError("UNAUTHORIZED", {
									message: `Name not on list. Try: ${JSON.stringify(Object.keys(guestLookup))}`,
								})
							: APIError.from("UNAUTHORIZED", ERROR_CODES.NAME_NOT_ON_GUEST_LIST)
					}

					// generate email based the input name
					const { emailDomainName = parseEmailDomain(ctx.context.baseURL) } = options ?? {}
					const email = `${cleanedName.toLowerCase().replaceAll(/\s/g, "")}.onguestlist@${emailDomainName}`

					const found = await ctx.context.internalAdapter.findUserByEmail(email)

					async function createNewUser() {
						const newUser = await ctx.context.internalAdapter.createUser({
							email,
							emailVerified: false,
							name: cleanedName,
							role: guestLookup[cleanedName].role,
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						if (!newUser) {
							throw APIError.from("INTERNAL_SERVER_ERROR", ERROR_CODES.FAILED_TO_CREATE_USER)
						}

						return newUser
					}

					const user = found ? found.user : await createNewUser()

					const session = await ctx.context.internalAdapter.createSession(user.id, true)

					if (!session) {
						return ctx.json(null, {
							status: 400,
							body: {
								message: ERROR_CODES.COULD_NOT_CREATE_SESSION.message,
							},
						})
					}
					await setSessionCookie(ctx, { session, user })

					return ctx.json({ token: session.token, user })
				}
			),

			revealGuestList: createAuthEndpoint(
				"/sign-in/guest-list/reveal",
				{
					method: "GET",
					metadata: {
						openapi: {
							description: "Reveal guest list if 'revealNames' is enabled. Empty array otherwise",
							responses: {
								200: {
									description: "List of allowed guest names or empty array",
									content: {
										"application/json": {
											schema: {
												type: "array",
												items: {
													type: "string",
												},
											},
										},
									},
								},
							},
						},
					},
				},
				async (ctx) => {
					return ctx.json(options?.revealNames ? Object.keys(guestLookup) : [])
				}
			),
		},
		$ERROR_CODES: ERROR_CODES,
	} satisfies BetterAuthPlugin
}
