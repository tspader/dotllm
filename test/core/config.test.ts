import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { Config, type RepoEntry } from "@spader/dotllm/core/config"

const foo: RepoEntry = { kind: "file", name: "foo", uri: "/mock/foo", description: "foo lib" }
const bar: RepoEntry = { kind: "url", name: "bar", uri: "https://example.com/bar", description: "" }

function globalDir(root: string): string {
  return process.platform === "win32"
    ? path.join(root, "dotllm")
    : path.join(root, ".local", "share", "dotllm")
}

function seedGlobal(root: string, content: string): void {
  const dir = globalDir(root)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "dotllm.json"), content)
}

function seedLocal(content: string): void {
  fs.mkdirSync(".llm", { recursive: true })
  fs.writeFileSync(".llm/dotllm.json", content)
}

test("global find returns match", () => {
  expect(Config.Global.find({ repos: [foo, bar] }, "foo")).toEqual(foo)
})

test("global find returns undefined on miss", () => {
  expect(Config.Global.find({ repos: [foo] }, "nope")).toBeUndefined()
})

test("global find on empty repos returns undefined", () => {
  expect(Config.Global.find({ repos: [] }, "anything")).toBeUndefined()
})

test("global add appends entry", () => {
  const result = Config.Global.add({ repos: [foo] }, bar)
  expect(result.repos).toHaveLength(2)
  expect(Config.Global.find(result, "bar")).toEqual(bar)
})

test("global add replaces by name", () => {
  const updated = { ...foo, description: "updated" }
  const result = Config.Global.add({ repos: [foo] }, updated)
  expect(result.repos).toHaveLength(1)
  expect(result.repos[0]!.description).toBe("updated")
})

test("global remove deletes by name", () => {
  const result = Config.Global.remove({ repos: [foo, bar] }, "foo")
  expect(result.repos).toHaveLength(1)
  expect(Config.Global.find(result, "foo")).toBeUndefined()
})

test("global remove no-ops on miss", () => {
  const result = Config.Global.remove({ repos: [foo] }, "nope")
  expect(result.repos).toHaveLength(1)
})

test("local has", () => {
  const config = { refs: { foo } }
  expect(Config.Local.has(config, "foo")).toBe(true)
  expect(Config.Local.has(config, "nope")).toBe(false)
})

test("local add inserts", () => {
  const result = Config.Local.add({ refs: {} }, foo)
  expect(Config.Local.has(result, "foo")).toBe(true)
})

test("local add overwrites existing key", () => {
  const updated: RepoEntry = { kind: "url", name: "foo", uri: "https://new", description: "new" }
  const result = Config.Local.add({ refs: { foo } }, updated)
  expect(result.refs["foo"]).toEqual(updated)
})

test("local remove deletes", () => {
  const result = Config.Local.remove({ refs: { foo, bar } }, "foo")
  expect(Config.Local.has(result, "foo")).toBe(false)
  expect(Config.Local.has(result, "bar")).toBe(true)
})

test("local remove on empty refs is no-op", () => {
  const result = Config.Local.remove({ refs: {} }, "nope")
  expect(result).toEqual({ refs: {} })
})

test("global read/write round-trip", async () => {
  await using env = await fixture()
  Config.Global.write({ repos: [foo, bar] })
  expect(Config.Global.read()).toEqual({ repos: [foo, bar] })
})

test("global read returns default when no file", async () => {
  await using env = await fixture()
  expect(Config.Global.read()).toEqual({ repos: [] })
})

test("global read returns default on malformed JSON", async () => {
  await using env = await fixture()
  seedGlobal(env.path, "not json{{{")
  expect(Config.Global.read()).toEqual({ repos: [] })
})

test("global read returns default on schema-invalid JSON", async () => {
  await using env = await fixture()
  seedGlobal(env.path, JSON.stringify({ repos: "not-an-array" }))
  expect(Config.Global.read()).toEqual({ repos: [] })
})

test("local read/write round-trip", async () => {
  await using env = await fixture()
  Config.Local.write({ refs: { foo } })
  expect(Config.Local.read()).toEqual({ refs: { foo } })
})

test("local read returns default when no file", async () => {
  await using env = await fixture()
  expect(Config.Local.read()).toEqual({ refs: {} })
})

test("local read returns default on malformed JSON", async () => {
  await using env = await fixture()
  seedLocal("not json{{{")
  expect(Config.Local.read()).toEqual({ refs: {} })
})

test("local read returns default on schema-invalid JSON", async () => {
  await using env = await fixture()
  seedLocal(JSON.stringify({ refs: "not-an-object" }))
  expect(Config.Local.read()).toEqual({ refs: {} })
})

test("storeDir returns path under HOME", async () => {
  await using env = await fixture()
  expect(Config.storeDir()).toBe(path.join(globalDir(env.path), "store"))
})

test("refDir returns .llm/reference", () => {
  expect(Config.refDir()).toBe(path.join(".llm", "reference"))
})
