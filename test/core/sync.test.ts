import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { sync, pull, Config } from "@spader/dotllm/core"

const entry = (name: string) =>
  ({ kind: "file" as const, name, uri: `/mock/${name}`, description: "" })

test("creates symlinks from local config", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
    local: ["a", "b"],
  })

  const result = sync()

  expect(result.linked.sort()).toEqual(["a", "b"])
  expect(fs.lstatSync(path.join(Config.refDir(), "a")).isSymbolicLink()).toBe(true)
  expect(fs.lstatSync(path.join(Config.refDir(), "b")).isSymbolicLink()).toBe(true)
})

test("removes stale symlinks", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
    local: ["a", "b"],
  })

  sync()

  const repo = Config.Global.find(Config.Global.read(), "a")!
  Config.Local.write({ refs: { a: repo } })

  const result = sync()

  expect(result.removed).toEqual(["b"])
  expect(result.unchanged).toEqual(["a"])
  expect(fs.existsSync(path.join(Config.refDir(), "b"))).toBe(false)
})

test("reports missing store entries", async () => {
  await using env = await fixture({
    global: [entry("ghost")],
    local: ["ghost"],
  })

  const result = sync()

  expect(result.missing).toEqual(["ghost"])
})

test("idempotent on second run", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
    local: ["a"],
  })

  sync()
  const result = sync()

  expect(result.linked).toEqual([])
  expect(result.removed).toEqual([])
  expect(result.unchanged).toEqual(["a"])
})

test("merges local refs into global config", async () => {
  const extra = { ...entry("extra"), description: "from local" }
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  Config.Local.write({ refs: { a: entry("a"), extra } })
  sync()

  const global = Config.Global.read()
  expect(Config.Global.find(global, "extra")).toEqual(extra)
  expect(Config.Global.find(global, "a")).toBeDefined()
})

test("file-kind re-creates store symlink when missing", async () => {
  await using env = await fixture({
    repos: { "a": {} },
  })

  const repo = { ...entry("a"), uri: env.dir("a") }
  Config.Global.write({ repos: [repo] })
  Config.Local.write({ refs: { a: repo } })

  const result = sync()

  expect(result.linked).toEqual(["a"])
  const store = path.join(Config.storeDir(), "a")
  expect(fs.lstatSync(store).isSymbolicLink()).toBe(true)
  expect(fs.readlinkSync(store)).toBe(env.dir("a"))
})

test("file-kind reports missing when original path gone", async () => {
  await using env = await fixture()

  const repo = { ...entry("gone"), uri: path.join(env.path, "nonexistent") }
  Config.Global.write({ repos: [repo] })
  Config.Local.write({ refs: { gone: repo } })

  const result = sync()

  expect(result.missing).toEqual(["gone"])
})

test("empty local config produces no links or removals", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  Config.Local.write({ refs: {} })
  const result = sync()

  expect(result.linked).toEqual([])
  expect(result.removed).toEqual([])
  expect(result.missing).toEqual([])
  expect(result.unchanged).toEqual([])
})

test("does not overwrite global when local refs empty", async () => {
  await using env = await fixture({
    global: [entry("existing")],
  })

  Config.Local.write({ refs: {} })
  sync()

  const global = Config.Global.read()
  expect(Config.Global.find(global, "existing")).toBeDefined()
})

test("pull reports error when reference dir missing", async () => {
  await using env = await fixture()

  const result = await pull(["ghost"])

  expect(result.count).toBe(1)
  expect(result.failed).toHaveLength(1)
  expect(result.failed[0]!.name).toBe("ghost")
  expect(result.failed[0]!.error).toContain("missing")
})
