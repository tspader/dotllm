import * as prompts from "@clack/prompts";
import type { SyncResult } from "@spader/dotllm/core";

export namespace Prompt {
  export function sync(result: SyncResult): void {
    const parts: string[] = [];
    if (result.linked.length > 0) parts.push(`${result.linked.length} added`);
    if (result.removed.length > 0) parts.push(`${result.removed.length} removed`);
    if (result.unchanged.length > 0) parts.push(`${result.unchanged.length} unchanged`);
    if (result.missing.length > 0) parts.push(`${result.missing.length} missing`);
    if (parts.length > 0) prompts.log.step(parts.join(", "));
  }
}
