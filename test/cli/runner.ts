import fs from "fs"
import path from "path"
import { expect } from "bun:test"
import { add, link, sync, remove } from "@spader/dotllm/cli/commands/index"
import { Config } from "@spader/dotllm/core"
import type { Command } from "@spader/dotllm/cli/yargs"

const commands: Record<string, Command> = { add, link, sync, remove }

type ExpectedEntry = {
  name?: string
  uri?: string
  kind?: "file" | "url"
  description?: string
}

type ExpectedStore = Record<string, { symlink: string } | true>

type Spec = {
  command: string
  argv: Record<string, unknown>
  expect: {
    exit?: number
    global?: Record<string, ExpectedEntry>
    store?: ExpectedStore
    local?: Record<string, ExpectedEntry>
    localAbsent?: string[]
    ref?: string[]
    refAbsent?: string[]
  }
}

class ExitError extends Error {
  code: number
  constructor(code: number) {
    super(`process.exit(${code})`)
    this.code = code
  }
}

export async function run(spec: Spec): Promise<void> {
  const cmd = commands[spec.command]
  if (!cmd?.handler) throw new Error(`unknown command: ${spec.command}`)

  const original = process.exit
  let exitCode: number | undefined

  process.exit = (code?: number) => {
    exitCode = code ?? 0
    throw new ExitError(exitCode)
  }

  try {
    await cmd.handler(spec.argv)
  } catch (e) {
    if (!(e instanceof ExitError)) throw e
  } finally {
    process.exit = original
  }

  if (spec.expect.exit !== undefined) {
    expect(exitCode).toBe(spec.expect.exit)
  }

  if (spec.expect.global) {
    const global = Config.Global.read()
    for (const [name, expected] of Object.entries(spec.expect.global)) {
      const entry = Config.Global.find(global, name)
      expect(entry).toBeDefined()
      if (!entry) continue
      if (expected.name !== undefined) expect(entry.name).toBe(expected.name)
      if (expected.uri !== undefined) expect(entry.uri).toBe(expected.uri)
      if (expected.kind !== undefined) expect(entry.kind).toBe(expected.kind)
      if (expected.description !== undefined) expect(entry.description).toBe(expected.description)
    }
  }

  if (spec.expect.store) {
    for (const [name, expected] of Object.entries(spec.expect.store)) {
      const target = path.join(Config.storeDir(), name)
      expect(fs.existsSync(target)).toBe(true)
      if (expected === true) continue
      expect(fs.lstatSync(target).isSymbolicLink()).toBe(true)
      expect(fs.readlinkSync(target)).toBe(expected.symlink)
    }
  }

  if (spec.expect.local) {
    const local = Config.Local.read()
    for (const [name, expected] of Object.entries(spec.expect.local)) {
      expect(Config.Local.has(local, name)).toBe(true)
      const entry = local.refs[name]
      if (!entry) continue
      if (expected.name !== undefined) expect(entry.name).toBe(expected.name)
      if (expected.uri !== undefined) expect(entry.uri).toBe(expected.uri)
      if (expected.kind !== undefined) expect(entry.kind).toBe(expected.kind)
      if (expected.description !== undefined) expect(entry.description).toBe(expected.description)
    }
  }

  if (spec.expect.localAbsent) {
    const local = Config.Local.read()
    for (const name of spec.expect.localAbsent) {
      expect(Config.Local.has(local, name)).toBe(false)
    }
  }

  if (spec.expect.ref) {
    for (const name of spec.expect.ref) {
      const target = path.join(Config.refDir(), name)
      expect(fs.existsSync(target)).toBe(true)
      expect(fs.lstatSync(target).isSymbolicLink()).toBe(true)
    }
  }

  if (spec.expect.refAbsent) {
    for (const name of spec.expect.refAbsent) {
      const target = path.join(Config.refDir(), name)
      expect(fs.existsSync(target)).toBe(false)
    }
  }
}
