import { test, expect } from "bun:test"
import { codeberg, github } from "@spader/dotllm/cli/commands/add"

test("HTTPS with .git", () => {
  expect(github("https://github.com/acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("HTTPS without .git", () => {
  expect(github("https://github.com/acme/foo")).toEqual({ owner: "acme", repo: "foo" })
})

test("HTTPS trailing slash", () => {
  expect(github("https://github.com/acme/foo/")).toEqual({ owner: "acme", repo: "foo" })
})

test("SSH SCP", () => {
  expect(github("git@github.com:acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("SSH URL", () => {
  expect(github("ssh://git@github.com/acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("non-GitHub HTTPS returns null", () => {
  expect(github("https://gitlab.com/acme/foo.git")).toBeNull()
})

test("non-GitHub SSH returns null", () => {
  expect(github("git@gitlab.com:acme/foo.git")).toBeNull()
})

test("malformed returns null", () => {
  expect(github("not-a-url")).toBeNull()
  expect(github("")).toBeNull()
})

test("extra path segments returns null", () => {
  expect(github("https://github.com/acme/foo/tree/main")).toBeNull()
})

test("Codeberg HTTPS with .git", () => {
  expect(codeberg("https://codeberg.org/acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("Codeberg SSH SCP", () => {
  expect(codeberg("git@codeberg.org:acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("Codeberg SSH URL", () => {
  expect(codeberg("ssh://git@codeberg.org/acme/foo.git")).toEqual({ owner: "acme", repo: "foo" })
})

test("non-Codeberg returns null", () => {
  expect(codeberg("https://github.com/acme/foo.git")).toBeNull()
})
