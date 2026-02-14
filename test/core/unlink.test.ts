import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { link, unlink, Config } from "@spader/dotllm/core"

const entry = (name: string) =>
  ({ kind: "file" as const, name, uri: `/mock/${name}`, description: "" })

test("unlinks a linked repo", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  link(["a"])
  const result = unlink("a")

  expect(result.ok).toBe(true)
  expect(fs.existsSync(path.join(Config.refDir(), "a"))).toBe(false)
  expect(Config.Local.has(Config.Local.read(), "a")).toBe(false)
})

test("fails when not linked", async () => {
  await using env = await fixture()

  const result = unlink("nope")

  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain("nope")
})

test("succeeds when symlink already deleted from disk", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  link(["a"])
  fs.unlinkSync(path.join(Config.refDir(), "a"))

  const result = unlink("a")

  expect(result.ok).toBe(true)
  expect(Config.Local.has(Config.Local.read(), "a")).toBe(false)
})

test("preserves other linked repos", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
  })

  link(["a", "b"])
  unlink("a")

  expect(Config.Local.has(Config.Local.read(), "b")).toBe(true)
  expect(fs.existsSync(path.join(Config.refDir(), "b"))).toBe(true)
})

test("updates local config on disk", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  link(["a"])
  unlink("a")

  const local = Config.Local.read()
  expect(Config.Local.has(local, "a")).toBe(false)
  expect(Object.keys(local.refs)).toHaveLength(0)
})
