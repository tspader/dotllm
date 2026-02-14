# Test Spec

## Philosophy

- **Declarative fixtures**: Tests describe filesystem state (repos, store entries, config), the `fixture()` function materializes it. No imperative setup.
- **Real implementations**: No mocks. Tests call actual functions against real (temp) filesystems.
- **Isolation**: Each test gets its own HOME and cwd via fixture. Cleanup via `await using`.
- **Config paths are lazy**: `src/core/config.ts` reads `process.env.HOME` at call time, not import time. This is what makes per-test isolation work without preloads.

## Fixture API (`test/fixture.ts`)

```ts
await using env = await fixture({
  repos:  { name: { remote?, files? } },  // git-init'd directories at $ROOT/name
  store:  { name: "repo" | true },         // symlink to repo dir, or plain mkdir
  global: RepoEntry[],                     // seed ~/.local/share/dotllm/dotllm.json
  local:  string[],                        // names from global to link in .llm/dotllm.json
})
// env.path = root, env.dir(name) = root/name
```

## Remaining: CLI parser tests

Export `stem()` and `github()` from `src/cli/commands/add.ts` (or move to a util module).

### `test/cli/stem.test.ts`

`stem(value)` extracts a repo name from a URL or path.

- HTTPS: `https://github.com/acme/foo.git` → `foo`
- HTTPS no .git: `https://github.com/acme/foo` → `foo`
- SSH SCP: `git@github.com:acme/foo.git` → `foo`
- SSH URL: `ssh://git@github.com/acme/foo.git` → `foo`
- Trailing slash stripped: `https://github.com/acme/foo/` → `foo`
- Query/fragment stripped: `https://github.com/acme/foo?ref=main` → `foo`
- Local path: `/home/user/projects/my-lib` → `my-lib`
- Relative path: `../my-lib` → `my-lib`
- Empty string → `""`

### `test/cli/github.test.ts`

`github(uri)` extracts `{ owner, repo }` from GitHub URLs, or returns null.

- HTTPS: `https://github.com/acme/foo.git` → `{ owner: "acme", repo: "foo" }`
- HTTPS no .git: `https://github.com/acme/foo` → same
- HTTPS trailing slash: `https://github.com/acme/foo/` → same
- SSH SCP: `git@github.com:acme/foo.git` → same
- SSH URL: `ssh://git@github.com/acme/foo.git` → same
- Non-GitHub HTTPS → null
- Non-GitHub SSH → null
- Malformed / empty → null
- Extra path segments (`/acme/foo/tree/main`) → null
