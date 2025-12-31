# zocms Tutorial CLI Rework Plan

## Overview
Rework zocms to focus on creating and managing tutorials for zo.computer blog.

## Commands

### 1. `zocms new 'Title'`
Creates a new tutorial with the given title. Slug is derived from title.

**Flow:**
1. Derive slug from title: `"How to Do Something"` → `how-to-do-something`
2. Create markdown file `<slug>.md` with frontmatter template
3. Create BaseHub entry in tutorials collection via `create_blocks`
4. Store the returned `_id` in frontmatter

**Slug Derivation:**
```typescript
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
    .trim()
    .replace(/\s+/g, '-');          // spaces to hyphens
}
// "How to Do Something!" → "how-to-do-something"
```

**BaseHub Details:**
- Parent ID (tutorials collection): `AKPiDEpK6mMxBjxDhXIze`
- Template component ID: `23abd95a28d73ca760243`
- Author (Ben Guo) ID: `SbZsqGSzk8pcCBiIN227h`

**Required Fields:**
- `title` - as provided
- `metaDescription` - placeholder text (required field)
- `date` - today's date (required field)
- `body` - empty/placeholder markdown (required field)
- `author` - reference to Ben Guo

**Markdown Template:**
```markdown
---
_id: <basehub-id>
_slug: <slug>
title: <Title>
metaDescription: ""
date: YYYY-MM-DD
---

Write your tutorial here...
```

### 2. `zocms publish <file.md>`
Publishes local markdown file to BaseHub.

**Flow:**
1. Parse frontmatter from file (get `_id`)
2. Parse markdown body
3. Call `update_blocks` with:
   - `title` from frontmatter
   - `metaDescription` from frontmatter
   - `body` as rich-text markdown
4. Auto-commit with message "Update <title>"

### 3. `zocms delete <file.md>`
Deletes tutorial from BaseHub and removes local file.

**Flow:**
1. Parse frontmatter to get `_id`
2. Call `delete_blocks` with the ID
3. Delete local markdown file
4. Confirm deletion

### 4. `zocms list`
Lists all tutorials with smart content previews.

**Flow:**
1. Query tutorials collection with body.markdown field
2. Generate smart excerpt for each tutorial
3. Display in clean terminal format

**Smart Excerpt Strategy:**
```typescript
function excerpt(markdown: string, maxLen = 200): string {
  // 1. Strip markdown syntax (links, bold, headings, etc)
  const plain = markdown
    .replace(/^#+\s+.*/gm, '')           // remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/[*_`]/g, '')               // remove bold/italic/code markers
    .replace(/\n+/g, ' ')                // collapse newlines
    .trim();
  
  // 2. Get first ~200 chars, break at word boundary
  if (plain.length <= maxLen) return plain;
  
  const truncated = plain.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '…';
}
```

**Display Format:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ How to Self-Host n8n (the Easy Way with AI)                        │
│ how-to-self-host-n8n                                               │
├─────────────────────────────────────────────────────────────────────┤
│ n8n is a powerful open-source workflow automation tool—think       │
│ Zapier or Make, but you own it. Self-hosting means no per-workflow │
│ fees, complete data privacy, and unlimited automations…            │
└─────────────────────────────────────────────────────────────────────┘
```

Or simpler flat format:
```
How to Self-Host n8n (the Easy Way with AI)
  slug: how-to-self-host-n8n
  n8n is a powerful open-source workflow automation tool—think Zapier
  or Make, but you own it. Self-hosting means no per-workflow fees…

How to Run VS Code in Your Browser
  slug: how-to-run-vs-code-in-your-browser
  Zo Computer gives you a personal cloud server where you can run code,
  build projects, and host services. Every Zo comes with a built-in…
```

**Query:**
```graphql
{
  tutorials {
    tutorials {
      items {
        _id
        _title
        _slug
        body { markdown }
      }
    }
  }
}
```

## Implementation Notes

### BaseHub API Calls
- **Create**: `create_blocks` with `parentId` and `data` array containing instance block
- **Update**: `update_blocks` with `id` and `value` object
- **Delete**: `delete_blocks` with `data` array of `{ id }` objects
- **Query**: `query_content` with GraphQL

### Instance Block Structure for Create
```json
{
  "type": "instance",
  "title": "How to Do Something",      // from input
  "slug": "how-to-do-something",       // derived from title
  "mainComponentId": "23abd95a28d73ca760243",
  "value": {
    "metaDescription": { "type": "text", "value": "..." },
    "date": { "type": "date", "value": "2025-12-31" },
    "body": { "type": "rich-text", "value": { "format": "markdown", "value": "..." } },
    "author": { "type": "reference", "value": "SbZsqGSzk8pcCBiIN227h" }
  }
}
```

### Update Block Structure
```json
{
  "id": "<block-id>",
  "title": "New Title",
  "value": {
    "metaDescription": { "type": "text", "value": "..." },
    "body": { "type": "rich-text", "value": { "format": "markdown", "value": "..." } }
  }
}
```

## File Structure
```
zocms/
├── zocms.ts          # Main CLI (rewrite)
├── zocms.prompt.md   # Zo prompt tool (update)
├── README.md         # Documentation (update)
├── package.json      # Update description
├── .env              # BASEHUB_MCP_TOKEN
└── *.md              # Tutorial markdown files
```

## Documentation Updates

### README.md
Update to reflect new tutorial-focused CLI:

```markdown
# zocms

CLI for creating and managing zo.computer tutorials.

## Commands

| Command | Description |
|---------|-------------|
| `zocms new 'Title'` | Create new tutorial (BaseHub + local .md) |
| `zocms publish <file.md>` | Publish local changes to BaseHub |
| `zocms delete <file.md>` | Delete from BaseHub + remove local file |
| `zocms list` | List all tutorials with previews |

## Workflow

\`\`\`bash
# Create a new tutorial
zocms new 'How to Do Something Cool'
# → creates how-to-do-something-cool.md

# Edit the markdown...

# Publish to BaseHub
zocms publish how-to-do-something-cool.md

# See all tutorials
zocms list
\`\`\`
```

### zocms.prompt.md
Update the Zo prompt tool:

```markdown
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
```

## Constants
```typescript
const TUTORIALS_PARENT_ID = "AKPiDEpK6mMxBjxDhXIze";
const TUTORIAL_COMPONENT_ID = "23abd95a28d73ca760243";
const BEN_AUTHOR_ID = "SbZsqGSzk8pcCBiIN227h";
```

