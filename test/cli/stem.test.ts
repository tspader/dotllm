import { test, expect } from "bun:test"
import { stem } from "@spader/dotllm/cli/commands/add"

test("HTTPS with .git", () => {
  expect(stem("https://github.com/acme/foo.git")).toBe("foo")
})

test("HTTPS without .git", () => {
  expect(stem("https://github.com/acme/foo")).toBe("foo")
})

test("SSH SCP", () => {
  expect(stem("git@github.com:acme/foo.git")).toBe("foo")
})

test("SSH URL", () => {
  expect(stem("ssh://git@github.com/acme/foo.git")).toBe("foo")
})

test("trailing slash stripped", () => {
  expect(stem("https://github.com/acme/foo/")).toBe("foo")
})

test("query string stripped", () => {
  expect(stem("https://github.com/acme/foo?ref=main")).toBe("foo")
})

test("fragment stripped", () => {
  expect(stem("https://github.com/acme/foo#readme")).toBe("foo")
})

test("local absolute path", () => {
  expect(stem("/home/user/projects/my-lib")).toBe("my-lib")
})

test("relative path", () => {
  expect(stem("../my-lib")).toBe("my-lib")
})

test("empty string", () => {
  expect(stem("")).toBe("")
})
