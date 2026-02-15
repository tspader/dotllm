import { test } from "bun:test"
import { fixture } from "../fixture"
import { run } from "./runner"

test("adds local repo with explicit name and description", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  await run({
    command: "add",
    argv: { uri: env.dir("my-lib"), name: "my-lib", description: "A cool library" },
    expect: {
      global: { "my-lib": { kind: "file", uri: env.dir("my-lib"), description: "A cool library" } },
      store: { "my-lib": { symlink: env.dir("my-lib") } },
    },
  })
})

test("registers without local config when dotllm.json absent", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
  })

  await run({
    command: "add",
    argv: { uri: env.dir("my-lib"), name: "my-lib", description: "" },
    expect: {
      global: { "my-lib": { kind: "file", uri: env.dir("my-lib") } },
      store: { "my-lib": { symlink: env.dir("my-lib") } },
      localAbsent: ["my-lib"],
      refAbsent: ["my-lib"],
    },
  })
})

test("auto-links when dotllm.json exists", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
    local: [],
  })

  await run({
    command: "add",
    argv: { uri: env.dir("my-lib"), name: "my-lib", description: "" },
    expect: {
      global: { "my-lib": { kind: "file", uri: env.dir("my-lib") } },
      store: { "my-lib": { symlink: env.dir("my-lib") } },
      local: { "my-lib": { name: "my-lib" } },
      ref: ["my-lib"],
    },
  })
})

test("second add is idempotent", async () => {
  await using env = await fixture({
    repos: { "my-lib": {} },
    local: [],
  })

  const spec = {
    command: "add",
    argv: { uri: env.dir("my-lib"), name: "my-lib", description: "desc" },
    expect: {
      global: { "my-lib": { kind: "file" as const, uri: env.dir("my-lib"), description: "desc" } },
      store: { "my-lib": { symlink: env.dir("my-lib") } },
      local: { "my-lib": { name: "my-lib" } },
      ref: ["my-lib"],
    },
  }

  await run(spec)
  await run(spec)
})

test("derives name from git remote", async () => {
  await using env = await fixture({
    repos: { "checkout": { remote: "git@github.com:acme/cool-lib.git" } },
  })

  await run({
    command: "add",
    argv: { uri: env.dir("checkout") },
    expect: {
      global: { "cool-lib": { kind: "file" } },
      store: { "cool-lib": { symlink: env.dir("checkout") } },
    },
  })
})

test("explicit name overrides git remote", async () => {
  await using env = await fixture({
    repos: { "checkout": { remote: "git@github.com:acme/cool-lib.git" } },
  })

  await run({
    command: "add",
    argv: { uri: env.dir("checkout"), name: "override" },
    expect: {
      global: { "override": { kind: "file", uri: env.dir("checkout") } },
      store: { "override": { symlink: env.dir("checkout") } },
    },
  })
})
