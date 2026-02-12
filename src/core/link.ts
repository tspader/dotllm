import { Config } from "@spader/dotllm/core/config";
import { sync, type SyncResult } from "@spader/dotllm/core/sync";

export function link(names: string[]): SyncResult {
  const global = Config.Global.read();
  const rows = names
    .map((name) => {
      const repo = Config.Global.find(global, name);
      if (!repo) return null;
      return [name, repo] as const;
    })
    .filter((row): row is readonly [string, (typeof global.repos)[number]] => row !== null);

  Config.Local.write({ refs: Object.fromEntries(rows) });
  return sync();
}
