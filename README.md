# zocms

CLI for updating Zo CMS content on Basehub

## Installation

```bash
git clone https://github.com/benguo/zo-basehub.git
cd zo-basehub
bun link
```

Now `zocms` is available globally.

## Updating

```bash
git pull
zocms update
```

## Setup

1. Go to **BaseHub dashboard → Settings → API Access**
2. Select **"Claude Code"** option
3. Copy the token from the command & add to env (BASEHUB_MCP_TOKEN)

## Commands

| Command | Description |
|---------|-------------|
| `zocms list <collection>` | List items as: title \| id |
| `zocms get <id>` | Download item → `slug.md` |
| `zocms push <file.md>` | Push and publish directly (auto-commits) |
| `zocms refresh <file.md>` | Pull published version (overwrites local). Ignores draft! |
| `zocms update` | Update CLI to latest version from source |

## Collections

- `posts` - Blog posts
- `tutorials` - Tutorials
- `use-cases` - Use cases
- `comparisons` - Comparisons
- `features` - Features

## Workflow

```bash
# Find the post you want to edit
zocms list posts

# Download it
zocms get abc123   # saves as e.g. personal-ai.md

# Pull latest from BaseHub before editing (overwrites local)
zocms refresh personal-ai.md

# Edit the markdown...

# Push changes back
zocms push personal-ai.md
```


