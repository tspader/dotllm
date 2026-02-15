import { test } from "bun:test"
import { fixture } from "../fixture"
import { run } from "./runner"

const entry = (name: string) =>
  ({ kind: "file" as const, name, uri: `/mock/${name}`, description: "" })

test("link by name updates local config and creates ref symlink", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
  })

  await run({
    command: "link",
    argv: { name: "a" },
    expect: {
      local: { "a": { name: "a" } },
      ref: ["a"],
    },
  })
})

test("link --remove unlinks repo", async () => {
  await using env = await fixture({
    repos: { "a": {} },
    global: [entry("a")],
    store: { "a": "a" },
    local: ["a"],
  })

  // first sync to create the ref symlink
  await run({
    command: "sync",
    argv: {},
    expect: {
      ref: ["a"],
    },
  })

  await run({
    command: "link",
    argv: { name: "a", remove: true },
    expect: {
      localAbsent: ["a"],
      refAbsent: ["a"],
    },
  })
})

test("link unknown repo exits with error", async () => {
  await using env = await fixture()

  await run({
    command: "link",
    argv: { name: "ghost" },
    expect: {
      exit: 1,
      localAbsent: ["ghost"],
      refAbsent: ["ghost"],
    },
  })
})
