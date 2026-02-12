import { Config } from "dotllm/core/config";
import { sync, type SyncResult } from "dotllm/core/sync";

export function link(names: string[]): SyncResult {
  Config.Local.write({ refs: names });
  return sync();
}
