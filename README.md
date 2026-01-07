# zocms

CLI for managing zo.computer content (posts, tutorials, updates).

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
| `zocms new <collection> 'Title'` | Create new item |
| `zocms download <id>` | Download item to .cms.md |
| `zocms publish <file.cms.md>` | Publish changes |
| `zocms delete <file.cms.md>` | Delete item |
| `zocms upload <image>` | Upload image to CDN |
| `zocms list [collection]` | List items |

## Collections

- `posts` - Blog posts
- `tutorials` - How-to tutorials
- `updates` - Product updates

## Workflow

```bash
# Create a new post
zocms new post 'My New Blog Post'
# → creates my-new-blog-post.cms.md

# Edit the markdown locally...

# Publish to BaseHub
zocms publish my-new-blog-post.cms.md

# Download existing content by ID
zocms download W6LnUCR5lMT5qdewK8QEi

# List all content
zocms list

# Delete an item
zocms delete my-new-blog-post.cms.md
```

## Cover Images

Upload images and add them to posts/tutorials:

```bash
# Option 1: Upload first, then add URL to frontmatter
zocms upload ~/Downloads/cover.png
# → Outputs URL to use in frontmatter

# Option 2: Add local path to frontmatter (auto-uploads on publish)
```

In your `.cms.md` file:
```yaml
---
title: "My Post"
coverImage: "/path/to/local/image.png"  # Auto-uploads on publish
# or
coverImage: "https://assets.basehub.com/..."  # Already uploaded
---
```

## File Pattern

All CMS-managed files use the `.cms.md` suffix, making it easy to:
- Filter with `ls *.cms.md` or `git status *.cms.md`
- Add to `.gitignore` if desired: `*.cms.md`
- Distinguish from regular markdown files

## Using with Zo

Once the prompt tool is installed, you can use natural language:

> "Create a new blog post called 'My Ideas'"
> "Upload ~/Downloads/cover.png and add it to my post"
> "List all tutorials"
> "Publish my-post.cms.md"

Zo will use the zocms CLI automatically.
