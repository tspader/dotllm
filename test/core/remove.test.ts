import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { remove, Config } from "@spader/dotllm/core"

const entry = (name: string, kind: "file" | "url" = "file") =>
  ({ kind, name, uri: `/mock/${name}`, description: "" }) as const

test("removes repo with symlinked store entry", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
    global: [entry("my-lib")],
    store: { "my-lib": "my-lib" },
  })

  const result = remove("my-lib")

  expect(result.ok).toBe(true)
  expect(Config.Global.find(Config.Global.read(), "my-lib")).toBeUndefined()
  expect(fs.existsSync(path.join(Config.storeDir(), "my-lib"))).toBe(false)
})

test("removes repo with directory store entry", async () => {
  await using env = await fixture({
    global: [entry("cloned", "url")],
    store: { "cloned": true },
  })

  const result = remove("cloned")

  expect(result.ok).toBe(true)
  expect(Config.Global.find(Config.Global.read(), "cloned")).toBeUndefined()
  expect(fs.existsSync(path.join(Config.storeDir(), "cloned"))).toBe(false)
})

test("fails on unknown name", async () => {
  await using env = await fixture()

  const result = remove("nope")

  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain("nope")
})

test("succeeds when store entry already deleted from disk", async () => {
  await using env = await fixture({
    global: [entry("gone")],
  })

  const result = remove("gone")

  expect(result.ok).toBe(true)
  expect(Config.Global.find(Config.Global.read(), "gone")).toBeUndefined()
})

test("preserves other repos in global config", async () => {
  await using env = await fixture({
    repos: { "keep": {} },
    global: [entry("keep"), entry("drop")],
    store: { "keep": "keep", "drop": true },
  })

  remove("drop")

  const global = Config.Global.read()
  expect(Config.Global.find(global, "keep")).toBeDefined()
  expect(Config.Global.find(global, "drop")).toBeUndefined()
})

test("does not touch local config", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
    local: ["a"],
  })

  remove("a")

  const local = Config.Local.read()
  expect(Config.Local.has(local, "a")).toBe(true)
})
