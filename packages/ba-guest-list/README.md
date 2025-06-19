# Better Auth Guest List

Plugin to provide fixed guest list login functionality for [better-auth](https://www.better-auth.com).

Intended use is for development testing and possibly demos with known login names, e.g. login as "Alice" or "Bob". You can use it with a single-input form or binding a name to a submit button. Names are single-word and case-insensitive.

The fixed guest list is defined on the server-side with optional roles so this plugin can also be used for testing roles.
You can optionally reveal the server guest list to the client (useful for demo login scenarios).

THIS IS NOT MEANT FOR SECURE PRODUCTION APP!

# How It Works

This plugin does not add any field to the schema as its intended use is temporary for testing and demos.

Internally, the guest name is transformed into an email via a fixed template, e.g. `tom.onguestlist@emaildomain` and that is the way users will be looked up.


# Installation

```console

pnpm add @nerdfolio/ba-guest-list

```

## Server-side setup

```typescript
// auth.ts
import { betterAuth } from "better-auth"
import { guestList } from "@nerdfolio/ba-guest-list"

export const auth = betterAuth({
	...otherConfigs,
	plugins: [
		...otherPlugins,
		guestList({
			allowGuests: [
				// required: can be array of names or array of {name: string, role?: comma-separated-string}
				{ name: "Alice", role: "admin" },
				{ name: "Bob", role: "user" },
				{ name: "Charlie", role: "user" },
			],
			// optional; whether the client can see this list (useful for demos)
			revealNames: true
		})
	],
})

```

Options:

 `allowGuests`: can be an array of names or array of `{name: string, role?: string}`. Role follows better-auth convention as a comma-separated string of actual roles.

 `revealNames`: is a boolean. When enabled, the client will be able to retrieve the guest names via `client.signIn.guestList.reveal()`. Names may also be returned in api errors during logins. When undefined or disabled, the `reveal()` endpoint will just return `null` and names will not be sent in error messages.

 `emailDomainName`: optional. Internally this plugin generates a fake email based on the guest name. It detects the app's domain and use that for email generation. You can override that with this option.


## Client-side setup

```typescript

import { guestListClient } from "@nerdfolio/ba-guest-list"

export const authClient = createAuthClient({
	plugins: [
		guestListClient()
	],
})

```

# Usage

```typescript

// GUEST_NAME has to be in the list of names defined in server-side setup, otherwise login will fail
authClient.signIn.guestList({
	name: GUEST_NAME
})
```

If you have enabled `revealNames` in your server-side setup, you can retrieve that list of names on the client side via `signIn.guestList.reveal()`. This may be useful for creating demos with a fixed list of login names as client-side hints.

```typescript
// just an async so you'll need to use it according to the way
// your frontend framework handles async

const guestNames = await authClient.signIn.guestList.reveal()
  .then(({ data, error: _e }) => data?.join(", "))
)

// for example, in Solidstart, you can retrieve this via createAsync
const guestList = createAsync(async () =>
	authClient.signIn.guestList.reveal().then(({ data, error: _e }) => data?.join(", "))
)

```
