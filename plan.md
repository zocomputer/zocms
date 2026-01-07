# zocms Multi-Collection CLI Plan

## Overview
Extend zocms to support all zo.computer content collections: posts, tutorials, and updates.

---

## Collections

### 1. Posts (`blog.posts`)
| Field | Type | Required |
|-------|------|----------|
| date | date | ✓ |
| tags | select (multi) | |
| excerpt | text | |
| coverImage | media | |
| body | rich-text | ✓ |
| author | reference | |

**IDs:**
- Parent: `9Aa5UozuFps3FH2K6Ldv2`
- Component: `9925022dfcee0c774cfe8`

**Tags:** Data Analysis, AI coding, Computing, Essay, Health, History, Interview, Product, Prompting

---

### 2. Tutorials (`tutorials.tutorials`)
| Field | Type | Required |
|-------|------|----------|
| metaDescription | text | ✓ |
| date | date | ✓ |
| coverImage | media | |
| body | rich-text | ✓ |
| author | reference | |

**IDs:**
- Parent: `AKPiDEpK6mMxBjxDhXIze`
- Component: `23abd95a28d73ca760243`

---

### 3. Updates (`updates.updates`)
| Field | Type | Required |
|-------|------|----------|
| date | date | ✓ |
| title | text | |
| body | rich-text | ✓ |

**IDs:**
- Parent: `jLMb48nXCjkWAKgxflurS`
- Component: `78e01cd7635aaad376c85`

**Note:** No author, no slug. Title defaults to date.

---

## Authors

| Name | ID |
|------|-----|
| Ben Guo | `SbZsqGSzk8pcCBiIN227h` |
| Rob Cheung | `ChzLe0r5GBDOgW8aCnT4Z` |
| Rob Cobb | `8PDTj3rkLsBrB43UFQmn2` |
| Ian Davidson | `QsspDFkAZRjq7gbeV6lxZ` |
| Jamie Park | `3TIPsAWP3XAOG3sTvhhym` |
| Ray Luo | `Of7x9NarKPblKqtsYV7Yg` |

---

## Commands

### `zocms new <collection> 'Title'`
Create new item in specified collection.

```bash
zocms new post 'My New Blog Post'
zocms new tutorial 'How to Do Something'
zocms new update 'December Update'
```

**Flow:**
1. Validate collection name
2. Derive slug from title (except updates)
3. Create BaseHub entry with collection-specific fields
4. Query for created item ID
5. Write local `<slug>.md` file with frontmatter

**Frontmatter by collection:**

```yaml
# Post
_id: "..."
_collection: "posts"
_slug: "my-new-blog-post"
title: "My New Blog Post"
excerpt: ""
date: "2025-12-31"
tags: []

# Tutorial
_id: "..."
_collection: "tutorials"
_slug: "how-to-do-something"
title: "How to Do Something"
metaDescription: ""
date: "2025-12-31"

# Update
_id: "..."
_collection: "updates"
title: "December Update"
date: "2025-12-31"
```

---

### `zocms download <id>`
Download any item by ID to local markdown file.

```bash
zocms download W6LnUCR5lMT5qdewK8QEi
# → personal-computing.md
```

**Flow:**
1. Query all collections to find item by ID
2. Determine collection type from structure
3. Extract all fields + body markdown
4. Write to `<slug>.md` (or `<date>.md` for updates)

---

### `zocms publish <file.md>`
Push local changes to BaseHub. (Existing, extend for all collections)

```bash
zocms publish my-post.md
```

**Flow:**
1. Parse frontmatter to get `_id` and `_collection`
2. Build update payload based on collection type
3. Call `update_blocks` with auto-commit

---

### `zocms delete <file.md>`
Delete from BaseHub and remove local file. (Existing, works as-is)

```bash
zocms delete my-post.md
```

---

### `zocms list [collection]`
List items with previews. Optional collection filter.

```bash
zocms list           # all collections
zocms list posts     # just posts
zocms list tutorials # just tutorials
zocms list updates   # just updates
```

**Display format:**
```
POSTS (9)

It's time for the computer to change
  slug: personal-computing
  The computer has been the same for 40 years … something in the middle … and this is how it ends

TUTORIALS (6)

How to Self-Host n8n (the Easy Way with AI)
  slug: how-to-self-host-n8n
  n8n is a powerful workflow automation … middle content … setup on your Zo Computer

UPDATES (5)

2025-12-16
  We shipped the new dashboard … middle … and more coming soon
```

---

## Collection Config

```typescript
const COLLECTIONS = {
  posts: {
    parentId: "9Aa5UozuFps3FH2K6Ldv2",
    componentId: "9925022dfcee0c774cfe8",
    path: ["blog", "posts", "items"],
    bodyField: "body",
    metaField: "excerpt",
    hasSlug: true,
    hasAuthor: true,
    fields: {
      excerpt: { type: "text", required: false },
      tags: { type: "select", required: false, multiple: true },
    },
  },
  tutorials: {
    parentId: "AKPiDEpK6mMxBjxDhXIze",
    componentId: "23abd95a28d73ca760243",
    path: ["tutorials", "tutorials", "items"],
    bodyField: "body",
    metaField: "metaDescription",
    hasSlug: true,
    hasAuthor: true,
    fields: {
      metaDescription: { type: "text", required: true },
    },
  },
  updates: {
    parentId: "jLMb48nXCjkWAKgxflurS",
    componentId: "78e01cd7635aaad376c85",
    path: ["updates", "updates", "items"],
    bodyField: "body",
    metaField: null,
    hasSlug: false,
    hasAuthor: false,
    fields: {
      title: { type: "text", required: false },
    },
  },
};

const AUTHORS = {
  ben: "SbZsqGSzk8pcCBiIN227h",
  rob_cheung: "ChzLe0r5GBDOgW8aCnT4Z",
  rob_cobb: "8PDTj3rkLsBrB43UFQmn2",
  ian: "QsspDFkAZRjq7gbeV6lxZ",
  jamie: "3TIPsAWP3XAOG3sTvhhym",
  ray_luo: "Of7x9NarKPblKqtsYV7Yg",
};

const DEFAULT_AUTHOR = AUTHORS.ben;
```

---

## Files to Update

### zocms.ts
- Add COLLECTIONS config with all three collections
- Add AUTHORS config
- Update `new` command to accept collection argument
- Add `download` command
- Update `list` to support optional collection filter
- Update `publish` to handle all collection types

### README.md
```markdown
# zocms

CLI for managing zo.computer content (posts, tutorials, updates).

## Commands

| Command | Description |
|---------|-------------|
| `zocms new <collection> 'Title'` | Create new item |
| `zocms download <id>` | Download item to .md |
| `zocms publish <file.md>` | Publish changes |
| `zocms delete <file.md>` | Delete item |
| `zocms list [collection]` | List items |

## Collections

- `posts` - Blog posts
- `tutorials` - How-to tutorials  
- `updates` - Product updates

## Workflow

\`\`\`bash
# Create a new post
zocms new post 'My New Post'

# Edit locally...

# Publish
zocms publish my-new-post.md

# Or download existing content
zocms download W6LnUCR5lMT5qdewK8QEi
\`\`\`
```

### zocms.prompt.md
```markdown
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
| `zocms download <id>` | Download to .md |
| `zocms publish <file.md>` | Publish changes |
| `zocms delete <file.md>` | Delete item |
| `zocms list [collection]` | List items |

## Collections

- `posts` - Blog posts
- `tutorials` - How-to tutorials
- `updates` - Product updates

## Examples

- "Create a new blog post called 'My Ideas'"
- "Download the personal computing post"
- "List all tutorials"
- "Publish my-post.md"
```

---

## Implementation Order

1. Add COLLECTIONS and AUTHORS config
2. Update `list` command to support all collections + optional filter
3. Add `download` command
4. Update `new` command to accept collection argument
5. Update `publish` to handle collection-specific fields
6. Update README.md and zocms.prompt.md

