import fs from "fs";
import path from "path";
import { Config } from "../../config.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace SyncCommand {
  export function run(): void {
    const local = Config.readLocal();

    if (local.refs.length === 0) {
      console.log(defaultTheme.dim("(no refs in local config)"));
      console.log(defaultTheme.dim("use `dotllm link` to select repos"));
      return;
    }

    const global = Config.readGlobal();
    const refDir = Config.refDir();
    fs.mkdirSync(refDir, { recursive: true });

    // Remove stale symlinks in reference/ that aren't in local config
    const existing = fs.readdirSync(refDir);
    const wanted = new Set(local.refs);

    for (const entry of existing) {
      if (!wanted.has(entry)) {
        const target = path.join(refDir, entry);
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(target);
          console.log(`${defaultTheme.dim("removed stale")} ${defaultTheme.primary(entry)}`);
        }
      }
    }

    // Create missing symlinks
    for (const name of local.refs) {
      const repo = Config.findRepo(global, name);
      if (!repo) {
        console.log(`${defaultTheme.error("missing")} ${defaultTheme.primary(name)} ${defaultTheme.dim("(not in global registry)")}`);
        continue;
      }

      const target = path.join(refDir, name);
      if (fs.existsSync(target)) {
        console.log(`${defaultTheme.dim("exists")} ${defaultTheme.primary(name)}`);
        continue;
      }

      fs.symlinkSync(repo.path, target, "dir");
      console.log(`${defaultTheme.success("linked")} ${defaultTheme.primary(name)} ${defaultTheme.dim(repo.path)}`);
    }
  }
}

export const sync: CommandDef = {
  description: "Re-create symlinks from .llm/llm.json",
  summary: "Sync symlinks from local config",
  handler: () => {
    SyncCommand.run();
  },
};
