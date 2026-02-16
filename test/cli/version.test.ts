import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
import { Build } from "#tools/build"
import { fixture } from "../fixture"

test("dotllm --version matches installed package.json", async () => {
  await using env = await fixture()

  fs.writeFileSync(
    path.join(env.path, "package.json"),
    JSON.stringify({ name: "dotllm-version-test", private: true }, null, 2),
  )

  const built = await Build.build({ pack: env.path })
  const tar = built.tar
  expect(path.isAbsolute(tar)).toBe(true)
  const installed = Bun.spawnSync(["npm", "install", "--no-package-lock", tar], {
    cwd: env.path,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(installed.exitCode).toBe(0)

  const raw = await Bun.file(path.join(env.path, "node_modules", "@spader", "dotllm", "package.json")).json() as { version?: unknown }
  const version = typeof raw.version === "string" ? raw.version : ""
  expect(version.length > 0).toBe(true)

  const bin = path.join(env.path, "node_modules", ".bin", "dotllm")
  const proc = Bun.spawnSync([bin, "--version"], {
    cwd: env.path,
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(proc.exitCode).toBe(0)
  expect(proc.stdout.toString().trim()).toBe(version)
})
