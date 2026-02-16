# dotllm
`dotllm` manages a system-wide cache of commonly referenced repositories and provides a beautiful command line for linking them anywhere on your system

```bash
> tree .llm/reference/
```

```
.llm/reference/
├── cloudflare-docs -> /home/spader/.local/share/dotllm/store/cloudflare-docs
├── cuda-toolkit -> /home/spader/.local/share/dotllm/store/cuda-toolkit
├── ghostty -> /home/spader/.local/share/dotllm/store/ghostty
├── node-llama-cpp -> /home/spader/.local/share/dotllm/store/node-llama-cpp
├── opencode -> /home/spader/.local/share/dotllm/store/opencode
└── sprites-docs -> /home/spader/.local/share/dotllm/store/sprites-docs
```

LLMs work best with references. If you're like me, every project has loose repositories lying around half a dozen places because some LLM needed it.

Instead, keep a cache of such repositories and use `dotllm` to link them to `.llm`. Check in `.llm/dotllm.json`, and a simple `dotllm sync` will restore all of your references.

# installation
```bash
bun install -g @spader/dotllm
```

# usage
Register a repository (by HTTPS, SSH, or local path)
```bash
dotllm add https://github.com/tspader/dotllm.git
```

In any directory, use the interactive CLI to edit which repositories are linked to `.llm/reference`
```bash
dotllm link
```

Check in `.llm/dotllm.json`. Then, on a fresh clone, link the repositories to your local copy
```bash
dotllm sync
```
