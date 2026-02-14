import fs from "fs"
import path from "path"
import os from "os"
import type { RepoEntry } from "@spader/dotllm/core/config"
import { Config } from "@spader/dotllm/core/config"

type Repo = {
  remote?: string
  files?: Record<string, string>
}

type State = {
  repos?: Record<string, Repo>
  store?: Record<string, string | true>
  global?: RepoEntry[]
  local?: string[]
}

type Env = {
  path: string
  dir(name: string): string
  [Symbol.asyncDispose](): Promise<void>
}

export async function fixture(state: State = {}): Promise<Env> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dotllm-")))
  const prev = process.env.HOME
  const cwd = process.cwd()
  process.env.HOME = root
  process.chdir(root)

  const git = { stdout: "pipe" as const, stderr: "pipe" as const }

  for (const [name, repo] of Object.entries(state.repos ?? {})) {
    const dir = path.join(root, name)
    fs.mkdirSync(dir, { recursive: true })

    for (const [file, content] of Object.entries(repo.files ?? {})) {
      const target = path.join(dir, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content)
    }

    Bun.spawnSync(["git", "init"], { ...git, cwd: dir })
    Bun.spawnSync(["git", "add", "."], { ...git, cwd: dir })
    Bun.spawnSync(["git", "commit", "--allow-empty", "-m", "init"], { ...git, cwd: dir })

    if (repo.remote) {
      Bun.spawnSync(["git", "remote", "add", "origin", repo.remote], { ...git, cwd: dir })
    }
  }

  if (state.global) {
    Config.Global.write({ repos: state.global })
  }

  if (state.store) {
    const dir = Config.storeDir()
    fs.mkdirSync(dir, { recursive: true })
    for (const [name, value] of Object.entries(state.store)) {
      const target = path.join(dir, name)
      if (value === true) {
        fs.mkdirSync(target, { recursive: true })
        continue
      }
      fs.symlinkSync(path.join(root, value), target, "dir")
    }
  }

  if (state.local) {
    const global = Config.Global.read()
    const refs: Record<string, RepoEntry> = {}
    for (const name of state.local) {
      const repo = Config.Global.find(global, name)
      if (repo) refs[name] = repo
    }
    Config.Local.write({ refs })
  }

  return {
    path: root,
    dir(name: string) { return path.join(root, name) },
    async [Symbol.asyncDispose]() {
      process.env.HOME = prev
      process.chdir(cwd)
      fs.rmSync(root, { recursive: true, force: true })
    },
  }
}
