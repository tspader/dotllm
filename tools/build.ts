import path from "path";
import fs from "fs";

export namespace Build {
  type Opt = {
    root?: string;
    out?: string;
    pack?: string;
  };

  type Result = {
    files: number;
    out: string;
    tar: string;
  };

  export async function build(opt: Opt = {}): Promise<Result> {
    const root = opt.root ?? path.resolve(import.meta.dir, "..");
    const out = opt.out ?? path.join(root, ".build");
    const packDir = opt.pack ?? out;

    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });

    const src = Array.from(new Bun.Glob("src/**/*.ts").scanSync(root));
    const res = await Bun.build({
      entrypoints: src.map(f => path.join(root, f)),
      outdir: out,
      root,
      target: "bun",
      packages: "external",
    });

    if (!res.success) {
      for (const log of res.logs) console.error(log);
      return Promise.reject(new Error("build failed"));
    }

    fs.chmodSync(path.join(out, "src/cli/index.js"), 0o755);

    const raw = await Bun.file(path.join(root, "package.json")).json() as Record<string, unknown>;
    raw.bin = { dotllm: "src/cli/index.js" };
    raw.exports = {
      "./cli": "./src/cli/index.js",
      "./cli/*": "./src/cli/*.js",
      "./core": "./src/core/index.js",
      "./core/*": "./src/core/*.js",
    };
    raw.files = ["src/**/*.js", "README.md"];
    delete raw.scripts;
    delete raw.devDependencies;
    delete raw.imports;
    await Bun.write(path.join(out, "package.json"), JSON.stringify(raw, null, 2) + "\n");

    fs.copyFileSync(path.join(root, "README.md"), path.join(out, "README.md"));

    const pack = Bun.spawnSync(["npm", "pack", "--json", "--pack-destination", packDir], {
      cwd: out,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (pack.exitCode !== 0) {
      return Promise.reject(new Error(pack.stderr.toString() || "npm pack failed"));
    }

    const json = JSON.parse(pack.stdout.toString()) as { filename?: string }[];
    const file = json[0]?.filename ?? "";
    if (file.length === 0) {
      return Promise.reject(new Error("npm pack did not return filename"));
    }

    return {
      files: src.length,
      out,
      tar: path.join(packDir, file),
    };
  }

  export async function main(): Promise<void> {
  }
}

if (import.meta.main) {
  const res = await Build.build();
  const root = path.resolve(import.meta.dir, "..");
  const rel = path.relative(root, res.tar);
  console.log(`${res.files} files compiled`);
  console.log(rel);
}
