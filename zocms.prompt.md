---
title: Tutorial CLI (zocms)
description: Create and manage zo.computer tutorials using the zocms CLI.
tags:
  - cms
  - tutorials
  - content
tool: true
---

Use this prompt to create and manage tutorials for zo.computer.

## Commands

| Command | Description |
|---------|-------------|
| `zocms new 'Title'` | Create new tutorial |
| `zocms publish <file.md>` | Publish to BaseHub |
| `zocms delete <file.md>` | Delete tutorial |
| `zocms list` | List all tutorials |

## Workflow

1. **Create** a new tutorial: `zocms new 'How to Do Something'`
2. **Edit** the generated markdown file
3. **Publish** changes: `zocms publish how-to-do-something.md`

## Setup

- Install from: https://github.com/zocomputer/zocms
- Set `BASEHUB_MCP_TOKEN` in Settings > Developers
