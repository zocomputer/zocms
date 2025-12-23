# zocms

CLI for managing BaseHub CMS content.

## Installation

### On Zo Computer

1. Clone the repo to your Integrations directory:
```bash
mkdir -p ~/Integrations/basehub
cd ~/Integrations/basehub
git clone https://github.com/zocomputer/zocms.git
```

2. Create a global symlink:
```bash
ln -sf ~/Integrations/basehub/zocms/zocms.ts /usr/local/bin/zocms
```

3. Copy the prompt tool to your Prompts directory:
```bash
cp ~/Integrations/basehub/zocms/zocms.prompt.md ~/Prompts/
```

4. Set your BaseHub MCP token (copy from Claude Code MCP command)

## Updating

```bash
cd ~/Integrations/basehub/zocms
git pull
```

## Commands

| Command | Description |
|---------|-------------|
| `zocms list <collection>` | List items as: title \| id |
| `zocms get <id>` | Download item → `slug.md` |
| `zocms push <file.md>` | Push and publish directly |
| `zocms refresh <file.md>` | Pull published version (overwrites local) |
| `zocms update` | Update CLI to latest version |

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

# Pull latest from BaseHub before editing
zocms refresh personal-ai.md

# Edit the markdown...

# Push changes back
zocms push personal-ai.md
```

## Using with Zo

Once the prompt tool is installed, you can use natural language:

> "List all blog posts"
> "Pull the latest version of the personal-ai post"
> "Push my changes to the features article"

Zo will use the zocms CLI automatically.

