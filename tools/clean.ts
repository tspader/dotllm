import path from "path";
import fs from "fs";

export namespace CleanTool {
  export function clean(root?: string): string {
    const base = root ?? path.resolve(import.meta.dir, "..");
    const out = path.join(base, ".build");
    fs.rmSync(out, { recursive: true, force: true });
    return out;
  }

  export async function main(): Promise<void> {
    const out = clean();
    const root = path.resolve(import.meta.dir, "..");
    const rel = path.relative(root, out);
    console.log(rel);
  }
}

if (import.meta.main) {
  await CleanTool.main();
}
