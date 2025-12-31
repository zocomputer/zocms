# zocms

CLI for creating and managing zo.computer tutorials.

## Installation

### On Zo Computer

1. Clone the repo to your Integrations directory:
```bash
mkdir -p ~/Integrations
cd ~/Integrations
git clone https://github.com/zocomputer/zocms.git
```

2. Compile and install the binary:
```bash
cd ~/Integrations/zocms
bun build --compile ./zocms.ts --outfile /usr/local/bin/zocms
```

3. Copy the prompt tool to your Prompts directory:
```bash
cp ~/Integrations/zocms/zocms.prompt.md ~/Prompts/
```

4. Set your BaseHub token in Settings > Developers:
```
BASEHUB_MCP_TOKEN=bshb_mcp_...
```

## Updating

```bash
cd ~/Integrations/zocms
git pull
bun build --compile ./zocms.ts --outfile /usr/local/bin/zocms
```

## Commands

| Command | Description |
|---------|-------------|
| `zocms new 'Title'` | Create new tutorial (BaseHub + local .md) |
| `zocms publish <file.md>` | Publish local changes to BaseHub |
| `zocms delete <file.md>` | Delete from BaseHub + remove local file |
| `zocms list` | List all tutorials with previews |

## Workflow

```bash
# Create a new tutorial
zocms new 'How to Do Something Cool'
# → creates how-to-do-something-cool.md

# Edit the markdown...

# Publish to BaseHub
zocms publish how-to-do-something-cool.md

# See all tutorials
zocms list

# Delete a tutorial
zocms delete how-to-do-something-cool.md
```

## Using with Zo

Once the prompt tool is installed, you can use natural language:

> "Create a new tutorial called 'How to Set Up Redis'"
> "Publish my redis tutorial"
> "List all tutorials"
> "Delete the redis tutorial"

Zo will use the zocms CLI automatically.
