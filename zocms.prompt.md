---
title: Content CLI (zocms)
description: Create and manage zo.computer content using the zocms CLI.
tags:
  - cms
  - content
tool: true
---

Manage posts, tutorials, and updates for zo.computer.

## Commands

| Command | Description |
|---------|-------------|
| `zocms new <collection> 'Title'` | Create new item |
| `zocms download <id>` | Download to .cms.md |
| `zocms publish <file.cms.md>` | Publish changes |
| `zocms delete <file.cms.md>` | Delete item |
| `zocms list [collection]` | List items |

## Collections

- `posts` - Blog posts
- `tutorials` - How-to tutorials
- `updates` - Product updates

## Examples

- "Create a new blog post called 'My Ideas'" → `zocms new post 'My Ideas'`
- "Create a tutorial about Redis" → `zocms new tutorial 'How to Set Up Redis'`
- "Download the personal computing post" → `zocms download W6LnUCR5lMT5qdewK8QEi`
- "List all tutorials" → `zocms list tutorials`
- "Publish my-post.cms.md" → `zocms publish my-post.cms.md`

## File Pattern

CMS files use `.cms.md` suffix for easy filtering (e.g., `ls *.cms.md`).

## Setup

- Install from: https://github.com/zocomputer/zocms
- Set `BASEHUB_MCP_TOKEN` in Settings > Developers
