import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { fixture } from "../fixture"
import { add, Config } from "@spader/dotllm/core"

test("adds local directory using basename", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  const result = await add(env.dir("my-lib"))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.entry.name).toBe("my-lib")
  expect(result.entry.kind).toBe("file")
  expect(result.entry.uri).toBe(env.dir("my-lib"))

  const store = path.join(Config.storeDir(), "my-lib")
  expect(fs.lstatSync(store).isSymbolicLink()).toBe(true)
  expect(fs.readlinkSync(store)).toBe(env.dir("my-lib"))
})

test("derives name from git remote", async () => {
  await using env = await fixture({
    repos: {
      "local-checkout": {
        remote: "git@github.com:acme/cool-lib.git",
      },
    },
  })

  const result = await add(env.dir("local-checkout"))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.entry.name).toBe("cool-lib")

  const store = path.join(Config.storeDir(), "cool-lib")
  expect(fs.lstatSync(store).isSymbolicLink()).toBe(true)
})

test("explicit name overrides git remote", async () => {
  await using env = await fixture({
    repos: {
      "local-checkout": {
        remote: "git@github.com:acme/cool-lib.git",
      },
    },
  })

  const result = await add(env.dir("local-checkout"), "override")

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.entry.name).toBe("override")
  expect(Config.Global.find(Config.Global.read(), "override")).toBeDefined()
})

test("stores description", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  const result = await add(env.dir("my-lib"), undefined, "A cool library")

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.entry.description).toBe("A cool library")

  const entry = Config.Global.find(Config.Global.read(), "my-lib")
  expect(entry?.description).toBe("A cool library")
})

test("defaults description to empty string", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  const result = await add(env.dir("my-lib"))

  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.entry.description).toBe("")
})

test("fails for nonexistent path", async () => {
  await using env = await fixture()

  const result = await add(env.dir("nope"))

  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain("does not exist")
})

test("fails for file path", async () => {
  await using env = await fixture({
    repos: {
      "has-file": { files: { "README.md": "hi" } },
    },
  })

  const result = await add(path.join(env.dir("has-file"), "README.md"))

  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain("Not a directory")
})

test("re-adding same repo is idempotent", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  const first = await add(env.dir("my-lib"))
  const second = await add(env.dir("my-lib"))

  expect(first.ok).toBe(true)
  expect(second.ok).toBe(true)

  const global = Config.Global.read()
  const matches = global.repos.filter((r) => r.name === "my-lib")
  expect(matches.length).toBe(1)
})

test("re-adding updates description", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  await add(env.dir("my-lib"), undefined, "old")
  await add(env.dir("my-lib"), undefined, "new")

  const entry = Config.Global.find(Config.Global.read(), "my-lib")
  expect(entry?.description).toBe("new")
})

test("preserves existing repos in global config", async () => {
  await using env = await fixture({
    repos: { "second": {} },
    global: [{ kind: "file", name: "first", uri: "/mock/first", description: "" }],
  })

  const result = await add(env.dir("second"))

  expect(result.ok).toBe(true)

  const global = Config.Global.read()
  expect(global.repos.length).toBe(2)
  expect(Config.Global.find(global, "first")).toBeDefined()
  expect(Config.Global.find(global, "second")).toBeDefined()
})

test("URL clone failure returns error", async () => {
  await using env = await fixture()

  const result = await add("https://example.invalid/no-such-repo.git")

  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain("git clone failed")
})

test("dir with no git remote falls back to basename", async () => {
  await using env = await fixture({
    repos: { "plain-dir": {} },
  })

  const result = await add(env.dir("plain-dir"))

  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.entry.name).toBe("plain-dir")
})
