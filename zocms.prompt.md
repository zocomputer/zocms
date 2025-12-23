---
title: BaseHub CMS (zocms)
description: Manage BaseHub content (pull, edit, push) using the zocms CLI.
tags:
  - cms
  - basehub
  - content
tool: true
---
Use this prompt to interact with BaseHub collections (posts, tutorials, use-cases, comparisons, features).

## Workflow

1. **List items** in a collection to find what to edit:
   `zocms list <collection>`
2. **Download** an item by its ID:
   `zocms get <id>` (creates a `.md` file in the current directory)
3. **Refresh** to ensure you have the latest published version:
   `zocms refresh <filename.md>`
4. **Edit** the content using `edit_file_llm`.
5. **Push** the changes back to BaseHub:
   `zocms push <filename.md>`

## Setup

- Make sure the repo is installed as an Integration: https://github.com/zocomputer/zocms
- Ensure the user has set `BASEHUB_MCP_TOKEN` in [Settings > Developers](/settings#developers)

## Commands Summary

| Command | Description |
|---------|-------------|
| `zocms list <collection>` | List items as: title \| id |
| `zocms get <id>` | Download item → `slug.md` |
| `zocms push <file.md>` | Push and publish directly |
| `zocms refresh <file.md>` | Overwrite local with published version |



