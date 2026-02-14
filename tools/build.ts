import path from "path";
import fs from "fs";

async function main() {
  const root = path.resolve(import.meta.dir, "..");
  const out = path.join(root, ".build");

  fs.rmSync(out, { recursive: true, force: true });

  // Compile all source files in one shot. `packages: "external"` keeps npm
  // deps and self-referencing @spader/dotllm/* imports as bare specifiers.
  const sources = Array.from(new Bun.Glob("src/**/*.ts").scanSync(root));
  const result = await Bun.build({
    entrypoints: sources.map(f => path.join(root, f)),
    outdir: out,
    root,
    target: "bun",
    packages: "external",
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  // Ensure CLI entry point is executable
  fs.chmodSync(path.join(out, "src/cli/index.js"), 0o755);

  // Generate a publish-ready package.json with JS paths
  const pkg = await Bun.file(path.join(root, "package.json")).json();
  pkg.bin = { dotllm: "src/cli/index.js" };
  pkg.exports = {
    "./cli": "./src/cli/index.js",
    "./cli/*": "./src/cli/*.js",
    "./core": "./src/core/index.js",
    "./core/*": "./src/core/*.js",
  };
  pkg.files = ["src/**/*.js", "README.md"];
  delete pkg.scripts;
  delete pkg.devDependencies;
  await Bun.write(path.join(out, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  fs.copyFileSync(path.join(root, "README.md"), path.join(out, "README.md"));

  // Create npm tarball
  const pack = Bun.spawnSync(["npm", "pack"], { cwd: out, stdout: "pipe", stderr: "pipe" });
  if (pack.exitCode !== 0) {
    console.error(pack.stderr.toString());
    process.exit(1);
  }

  console.log(`${sources.length} files compiled`);
  console.log(`.build/${pack.stdout.toString().trim()}`);
}

main();
