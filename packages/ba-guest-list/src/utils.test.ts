import { describe, expect, it } from "vitest"
import { formatName, parseEmailDomain } from "./utils"

describe("formatName", () => {
	it("capitalizes a single lowercase word", () => {
		expect(formatName("alice")).toBe("Alice")
	})

	it("capitalizes and lowercases the rest of an all-caps word", () => {
		expect(formatName("ALICE")).toBe("Alice")
	})

	it("strips all whitespace and capitalizes what remains", () => {
		expect(formatName("mary ann")).toBe("Maryann")
	})

	it("strips internal, leading, and trailing whitespace", () => {
		expect(formatName("  bo  bby  ")).toBe("Bobby")
	})

	it("leaves an already-clean, already-capitalized name equivalent", () => {
		expect(formatName("Bob")).toBe("Bob")
	})
})

describe("parseEmailDomain", () => {
	it("returns the hostname for a normal URL with port and path", () => {
		expect(parseEmailDomain("http://example.com:3000/some/path")).toBe("example.com")
	})

	it("returns the literal localhost.example.com for hostname 'localhost'", () => {
		expect(parseEmailDomain("http://localhost:3000")).toBe("localhost.example.com")
	})

	it("returns the hostname unchanged for a subdomain URL", () => {
		expect(parseEmailDomain("https://auth.myapp.io/api")).toBe("auth.myapp.io")
	})

	it("returns null for an invalid URL", () => {
		expect(parseEmailDomain("not-a-valid-url")).toBeNull()
	})
})
