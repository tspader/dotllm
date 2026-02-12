import fs from "fs";
import path from "path";

const GLOBAL_DIR = path.join(
  process.env.HOME ?? "",
  ".local",
  "share",
  "dotllm",
);
const GLOBAL_FILE = path.join(GLOBAL_DIR, "llm.json");
const LOCAL_DIR = ".llm";
const LOCAL_FILE = path.join(LOCAL_DIR, "llm.json");

export type RepoEntry = {
  name: string;
  path: string;
  description: string;
};

export type GlobalConfig = {
  repos: RepoEntry[];
};

export type LocalConfig = {
  refs: string[];
};

export namespace Config {
  export function globalPath(): string {
    return GLOBAL_FILE;
  }

  export function localPath(): string {
    return LOCAL_FILE;
  }

  export function readGlobal(): GlobalConfig {
    const raw = readJson(GLOBAL_FILE);
    if (!raw) return { repos: [] };
    const repos = Array.isArray(raw.repos) ? raw.repos : [];
    return { repos: repos.filter(isRepoEntry) };
  }

  export function writeGlobal(config: GlobalConfig): void {
    fs.mkdirSync(GLOBAL_DIR, { recursive: true });
    fs.writeFileSync(GLOBAL_FILE, JSON.stringify(config, null, 2) + "\n");
  }

  export function readLocal(): LocalConfig {
    const raw = readJson(LOCAL_FILE);
    if (!raw) return { refs: [] };
    const refs = Array.isArray(raw.refs) ? raw.refs : [];
    return { refs: refs.filter((r: unknown) => typeof r === "string") };
  }

  export function writeLocal(config: LocalConfig): void {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(config, null, 2) + "\n");
  }

  export function refDir(): string {
    return path.join(LOCAL_DIR, "reference");
  }

  export function findRepo(global: GlobalConfig, name: string): RepoEntry | undefined {
    return global.repos.find((r) => r.name === name);
  }

  export function addRepo(global: GlobalConfig, entry: RepoEntry): GlobalConfig {
    const filtered = global.repos.filter((r) => r.name !== entry.name);
    return { repos: [...filtered, entry] };
  }

  export function removeRepo(global: GlobalConfig, name: string): GlobalConfig {
    return { repos: global.repos.filter((r) => r.name !== name) };
  }
}

function readJson(filepath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

function isRepoEntry(value: unknown): value is RepoEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    typeof obj.path === "string" &&
    typeof obj.description === "string"
  );
}
