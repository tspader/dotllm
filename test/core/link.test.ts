import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { link, Config } from "@spader/dotllm/core"

const entry = (name: string) =>
  ({ kind: "file" as const, name, uri: `/mock/${name}`, description: "" })

test("links repos into reference dir", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
  })

  const result = link(["a", "b"])

  expect(result.linked.sort()).toEqual(["a", "b"])
  expect(fs.existsSync(path.join(Config.refDir(), "a"))).toBe(true)
  expect(fs.existsSync(path.join(Config.refDir(), "b"))).toBe(true)
})

test("empty list clears all links", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  link(["a"])
  const result = link([])

  expect(result.removed).toEqual(["a"])
  expect(fs.existsSync(path.join(Config.refDir(), "a"))).toBe(false)
})

test("subset removes deselected repos", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
  })

  link(["a", "b"])
  const result = link(["a"])

  expect(result.removed).toEqual(["b"])
  expect(result.unchanged).toEqual(["a"])
  expect(fs.existsSync(path.join(Config.refDir(), "b"))).toBe(false)
})

test("skips unknown names", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  const result = link(["a", "ghost"])

  expect(result.linked).toEqual(["a"])
  expect(result.missing).toEqual([])
})

test("writes local config with linked entries", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  link(["a"])

  const local = Config.Local.read()
  expect(Config.Local.has(local, "a")).toBe(true)
  expect(local.refs["a"]!.name).toBe("a")
})

test("re-link same set is idempotent", async () => {
  await using env = await fixture({
    repos: { "a": {}, "b": {} },
    global: [entry("a"), entry("b")],
    store: { "a": "a", "b": "b" },
  })

  link(["a", "b"])
  const result = link(["a", "b"])

  expect(result.linked).toEqual([])
  expect(result.removed).toEqual([])
  expect(result.unchanged.sort()).toEqual(["a", "b"])
})
