#!/usr/bin/env bun
/** zocms - Content CLI for zo.computer. See README.md for docs. */

const MCP_URL = "https://basehub.com/api/mcp";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface CollectionConfig {
  parentId: string;
  componentId: string;
  path: string[];
  bodyField: string;
  metaField: string | null;
  hasSlug: boolean;
  hasAuthor: boolean;
}

const COLLECTIONS: Record<string, CollectionConfig> = {
  posts: {
    parentId: "9Aa5UozuFps3FH2K6Ldv2",
    componentId: "9925022dfcee0c774cfe8",
    path: ["blog", "posts", "items"],
    bodyField: "body",
    metaField: "excerpt",
    hasSlug: true,
    hasAuthor: true,
  },
  tutorials: {
    parentId: "AKPiDEpK6mMxBjxDhXIze",
    componentId: "23abd95a28d73ca760243",
    path: ["tutorials", "tutorials", "items"],
    bodyField: "body",
    metaField: "metaDescription",
    hasSlug: true,
    hasAuthor: true,
  },
  updates: {
    parentId: "jLMb48nXCjkWAKgxflurS",
    componentId: "78e01cd7635aaad376c85",
    path: ["updates", "updates", "items"],
    bodyField: "body",
    metaField: null,
    hasSlug: false,
    hasAuthor: false,
  },
};

const AUTHORS: Record<string, string> = {
  ben: "SbZsqGSzk8pcCBiIN227h",
  rob_cheung: "ChzLe0r5GBDOgW8aCnT4Z",
  rob_cobb: "8PDTj3rkLsBrB43UFQmn2",
  ian: "QsspDFkAZRjq7gbeV6lxZ",
  jamie: "3TIPsAWP3XAOG3sTvhhym",
  ray_luo: "Of7x9NarKPblKqtsYV7Yg",
};

const DEFAULT_AUTHOR = AUTHORS.ben;

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.BASEHUB_MCP_TOKEN;
  if (!token) {
    console.error("Error: BASEHUB_MCP_TOKEN not set");
    console.error("Get it from: ~/.cursor/mcp.json or BaseHub dashboard");
    process.exit(1);
  }
  return token;
}

async function mcpCall(
  method: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params: { name: toolName, arguments: args },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error || data.result?.isError) {
    const msg =
      data.result?.content?.[0]?.text ||
      data.error?.message ||
      JSON.stringify(data);
    throw new Error(msg);
  }
  return data.result;
}

async function query(gql: string, draft = true): Promise<Record<string, unknown>> {
  const result = (await mcpCall("tools/call", "query_content", {
    query: gql,
    draft,
  })) as { content: { text: string }[] };
  const text = result.content?.[0]?.text;
  if (!text) throw new Error("No content in response");
  const parsed = JSON.parse(text);
  if (parsed.data) return parsed.data;
  return parsed;
}

async function getUploadUrl(fileName: string): Promise<{ url: string; uploadUrl: string }> {
  const result = (await mcpCall("tools/call", "get_upload_url", {
    fileName,
  })) as { content: { text: string }[] };
  
  // Combine all text content
  const allText = result.content?.map(c => c.text).join("\n") || "";
  
  // Parse: "Upload URL: https://assets.basehub.com/..."
  const urlMatch = allText.match(/Upload URL: (https:\/\/[^\s]+)/);
  // Parse: curl command to get upload endpoint
  const uploadMatch = allText.match(/curl -X PUT --data-binary @[^\s]+ (https:\/\/[^\s`]+)/);
  
  if (!urlMatch) throw new Error("Could not parse upload URL from: " + allText.slice(0, 200));
  
  return {
    url: urlMatch[1],
    uploadUrl: uploadMatch ? uploadMatch[1] : "",
  };
}

async function uploadFile(localPath: string): Promise<string> {
  const file = Bun.file(localPath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${localPath}`);
  }

  const fileName = localPath.split("/").pop() || "image.png";
  const { url, uploadUrl } = await getUploadUrl(fileName);

  if (!uploadUrl) {
    throw new Error("Could not get upload URL");
  }

  // Read file and upload
  const fileData = await file.arrayBuffer();
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: fileData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }

  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function excerpt(markdown: string): string {
  const plain = markdown
    .replace(/^#+\s+.*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= 300) return plain;

  const snippetLen = 250;
  const beginRaw = plain.slice(0, snippetLen);
  const beginSpace = beginRaw.lastIndexOf(" ");
  const begin = beginRaw.slice(0, beginSpace > 20 ? beginSpace : snippetLen);

  const midStart = Math.floor(plain.length / 2) - snippetLen / 2;
  const midRaw = plain.slice(midStart, midStart + snippetLen);
  const midFirstSpace = midRaw.indexOf(" ");
  const midLastSpace = midRaw.lastIndexOf(" ");
  const middle = midRaw.slice(
    midFirstSpace > 0 ? midFirstSpace + 1 : 0,
    midLastSpace > midFirstSpace ? midLastSpace : undefined
  );

  const endRaw = plain.slice(-snippetLen);
  const endSpace = endRaw.indexOf(" ");
  const end = endRaw.slice(endSpace > 0 ? endSpace + 1 : 0);

  return `${begin} … ${middle} … ${end}`;
}

function toFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === "string" && (v.includes("\n") || v.includes(":"))) {
      lines.push(`${k}: |`);
      for (const line of v.split("\n")) {
        lines.push(`  ${line}`);
      }
    } else if (typeof v === "string") {
      lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  return lines.join("\n");
}

function parseFrontmatter(content: string): {
  fm: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };

  const fm: Record<string, unknown> = {};
  const lines = match[1].split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if (val === "|") {
      const multiLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith("  ")) {
        multiLines.push(lines[i].slice(2));
        i++;
      }
      fm[key] = multiLines.join("\n");
      continue;
    }

    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        fm[key] = JSON.parse(val);
      } catch {
        fm[key] = val;
      }
      i++;
      continue;
    }

    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    } else if (val === "true") {
      fm[key] = true;
      i++;
      continue;
    } else if (val === "false") {
      fm[key] = false;
      i++;
      continue;
    } else if (/^-?\d+$/.test(val)) {
      fm[key] = parseInt(val);
      i++;
      continue;
    }
    fm[key] = val;
    i++;
  }
  return { fm, body: match[2] };
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getNested(obj: Record<string, unknown>, path: string[]): unknown[] {
  let result: unknown = obj;
  for (const key of path) {
    if (!result || typeof result !== "object") return [];
    result = (result as Record<string, unknown>)[key];
  }
  return Array.isArray(result) ? result : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

// Allow singular forms
const COLLECTION_ALIASES: Record<string, string> = {
  post: "posts",
  tutorial: "tutorials",
  update: "updates",
};

function resolveCollection(name: string): string {
  return COLLECTION_ALIASES[name] || name;
}

async function newItem(collectionName: string, title: string) {
  collectionName = resolveCollection(collectionName);
  const config = COLLECTIONS[collectionName];
  if (!config) {
    console.error(`Unknown collection: ${collectionName}`);
    console.error(`Available: ${Object.keys(COLLECTIONS).join(", ")} (or singular: post, tutorial, update)`);
    process.exit(1);
  }

  const slug = config.hasSlug ? slugify(title) : today();
  const filename = `${slug}.cms.md`;

  if (await Bun.file(filename).exists()) {
    console.error(`Error: ${filename} already exists`);
    process.exit(1);
  }

  console.log(`Creating ${collectionName.slice(0, -1)}: ${title}`);
  if (config.hasSlug) console.log(`  slug: ${slug}`);

  // Build create data based on collection type
  const value: Record<string, unknown> = {
    date: { type: "date", value: today() },
    [config.bodyField]: {
      type: "rich-text",
      value: { format: "markdown", value: "Write your content here..." },
    },
  };

  if (config.metaField) {
    value[config.metaField] = { type: "text", value: "" };
  }

  if (config.hasAuthor) {
    value.author = { type: "reference", value: DEFAULT_AUTHOR };
  }

  // Updates use title field inside value, others use title at top level
  if (collectionName === "updates") {
    value.title = { type: "text", value: title };
  }

  const createData: Record<string, unknown> = {
    type: "instance",
    title: title,
    mainComponentId: config.componentId,
    value,
  };

  if (config.hasSlug) {
    createData.slug = slug;
  }

  await mcpCall("tools/call", "create_blocks", {
    parentId: config.parentId,
    data: [createData],
  });

  // Query for created item
  const queryPath = config.path.slice(0, -1);
  const fields = config.hasSlug ? "_id _slug" : "_id _title";
  const gqlPath = queryPath.reduceRight(
    (acc, key) => `${key} { ${acc} }`,
    `items { ${fields} }`
  );

  const findResult = await query(`{ ${gqlPath} }`);
  const items = getNested(findResult, config.path) as { _id: string; _slug?: string; _title?: string }[];

  let created: { _id: string } | undefined;
  if (config.hasSlug) {
    created = items.find((item) => item._slug === slug);
  } else {
    // For updates, find by title
    created = items.find((item) => item._title === title);
  }

  if (!created) throw new Error("Created item not found");
  const createdId = created._id;

  // Create local markdown file
  const fm: Record<string, unknown> = {
    _id: createdId,
    _collection: collectionName,
    title: title,
    date: today(),
  };

  if (config.hasSlug) {
    fm._slug = slug;
  }

  if (config.metaField) {
    fm[config.metaField] = "";
  }

  if (collectionName === "posts") {
    fm.tags = [];
  }

  const mdContent = `---\n${toFrontmatter(fm)}\n---\n\nWrite your content here...\n`;
  await Bun.write(filename, mdContent);

  console.log(`\nCreated: ${filename}`);
  console.log(`BaseHub ID: ${createdId}`);
  console.log(`\nEdit the file, then run: zocms publish ${filename}`);
}

async function download(id: string) {
  // Try each collection to find the item
  for (const [collectionName, config] of Object.entries(COLLECTIONS)) {
    const queryPath = config.path.slice(0, -1);
    const metaFields = config.metaField ? `${config.metaField}` : "";
    // Include coverImage in query for posts/tutorials
    const coverImageField = collectionName !== "updates" ? "coverImage { url }" : "";
    const fields = `_id _title ${config.hasSlug ? "_slug" : ""} date ${metaFields} ${coverImageField} ${config.bodyField} { markdown }`;

    const gqlPath = queryPath.reduceRight(
      (acc, key) => `${key} { ${acc} }`,
      `items { ${fields} }`
    );

    try {
      const data = await query(`{ ${gqlPath} }`);
      const items = getNested(data, config.path) as Record<string, unknown>[];
      const item = items.find((i) => i._id === id);

      if (item) {
        const title = item._title as string;
        const slug = config.hasSlug ? (item._slug as string) : (item.date as string);
        const filename = `${slug}.cms.md`;

        // Build frontmatter
        const fm: Record<string, unknown> = {
          _id: item._id,
          _collection: collectionName,
          title: title,
        };

        if (config.hasSlug) {
          fm._slug = item._slug;
        }

        if (item.date) fm.date = item.date;
        if (config.metaField && item[config.metaField]) {
          fm[config.metaField] = item[config.metaField];
        }

        // Handle cover image
        const coverImage = item.coverImage as { url?: string } | undefined;
        if (coverImage?.url) {
          fm.coverImage = coverImage.url;
        }

        // Handle posts tags
        if (collectionName === "posts" && item.tags) {
          fm.tags = item.tags;
        }

        const bodyObj = item[config.bodyField] as { markdown?: string } | undefined;
        const body = bodyObj?.markdown || "";

        const mdContent = `---\n${toFrontmatter(fm)}\n---\n\n${body}`;
        await Bun.write(filename, mdContent);

        console.log(`Downloaded: ${filename}`);
        console.log(`Collection: ${collectionName}`);
        return;
      }
    } catch {
      // Try next collection
    }
  }

  console.error(`Item not found: ${id}`);
  process.exit(1);
}

async function publish(filepath: string) {
  const file = Bun.file(filepath);
  if (!(await file.exists())) {
    console.error(`Error: ${filepath} not found`);
    process.exit(1);
  }

  const raw = await file.text();
  const { fm, body } = parseFrontmatter(raw);

  const id = fm._id as string;
  if (!id) {
    console.error("Error: File must have _id in frontmatter");
    process.exit(1);
  }

  const collectionName = fm._collection as string;
  const config = collectionName ? COLLECTIONS[collectionName] : null;

  const title = (fm.title as string) || "Untitled";
  console.log(`Publishing: ${title}`);

  // Handle coverImage - upload if local path
  let coverImageUrl = fm.coverImage as string | undefined;
  if (coverImageUrl && !coverImageUrl.startsWith("http")) {
    console.log(`Uploading cover image: ${coverImageUrl}`);
    coverImageUrl = await uploadFile(coverImageUrl);
    console.log(`  → ${coverImageUrl}`);
  }

  // Build update value based on collection
  const value: Record<string, unknown> = {
    [config?.bodyField || "body"]: {
      type: "rich-text",
      value: { format: "markdown", value: body.trim() },
    },
  };

  // Add cover image if present
  if (coverImageUrl) {
    value.coverImage = { type: "media", value: { url: coverImageUrl } };
  }

  // Add meta field if present
  if (config?.metaField && fm[config.metaField] !== undefined) {
    value[config.metaField] = { type: "text", value: fm[config.metaField] || "" };
  }

  // Handle posts tags
  if (collectionName === "posts" && fm.tags) {
    value.tags = { type: "select", value: fm.tags };
  }

  // Updates have title inside value
  if (collectionName === "updates") {
    value.title = { type: "text", value: title };
  }

  const updateData: Record<string, unknown> = { id, value };

  // Only set title at top level for non-updates
  if (collectionName !== "updates") {
    updateData.title = title;
  }

  await mcpCall("tools/call", "update_blocks", {
    data: [updateData],
    autoCommit: `Update ${title}`,
  });

  console.log(`Published: ${title}`);
}

async function upload(localPath: string) {
  console.log(`Uploading: ${localPath}`);
  const url = await uploadFile(localPath);
  console.log(`\nUploaded: ${url}`);
  console.log(`\nUse this URL in your frontmatter:`);
  console.log(`coverImage: "${url}"`);
}

async function deleteItem(filepath: string) {
  const file = Bun.file(filepath);
  if (!(await file.exists())) {
    console.error(`Error: ${filepath} not found`);
    process.exit(1);
  }

  const raw = await file.text();
  const { fm } = parseFrontmatter(raw);

  const id = fm._id as string;
  if (!id) {
    console.error("Error: File must have _id in frontmatter");
    process.exit(1);
  }

  const title = (fm.title as string) || filepath;
  console.log(`Deleting: ${title}`);

  await mcpCall("tools/call", "delete_blocks", {
    data: [{ id }],
    autoCommit: `Delete ${title}`,
  });

  const fs = await import("fs/promises");
  await fs.unlink(filepath);

  console.log(`Deleted: ${filepath}`);
  console.log(`Removed from BaseHub: ${id}`);
}

async function list(collectionFilter?: string) {
  if (collectionFilter) {
    collectionFilter = resolveCollection(collectionFilter);
  }

  const collectionsToList = collectionFilter
    ? { [collectionFilter]: COLLECTIONS[collectionFilter] }
    : COLLECTIONS;

  if (collectionFilter && !COLLECTIONS[collectionFilter]) {
    console.error(`Unknown collection: ${collectionFilter}`);
    console.error(`Available: ${Object.keys(COLLECTIONS).join(", ")} (or singular: post, tutorial, update)`);
    process.exit(1);
  }

  for (const [collectionName, config] of Object.entries(collectionsToList)) {
    const queryPath = config.path.slice(0, -1);
    const fields = `_id _title ${config.hasSlug ? "_slug" : ""} ${config.bodyField} { markdown }`;

    const gqlPath = queryPath.reduceRight(
      (acc, key) => `${key} { ${acc} }`,
      `items { ${fields} }`
    );

    const data = await query(`{ ${gqlPath} }`);
    const items = getNested(data, config.path) as {
      _id: string;
      _title: string;
      _slug?: string;
      body?: { markdown: string };
    }[];

    console.log(`\n${collectionName.toUpperCase()} (${items.length})\n`);

    for (const item of items) {
      const bodyField = item[config.bodyField as keyof typeof item] as { markdown?: string } | undefined;
      const preview = excerpt(bodyField?.markdown || "");
      console.log(item._title);
      if (config.hasSlug && item._slug) {
        console.log(`  slug: ${item._slug}`);
      }
      console.log(`  ${preview}`);
      console.log();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const HELP = `zocms - Content CLI for zo.computer

Commands:
  new <collection> <title>   Create new item (posts, tutorials, updates)
  download <id>              Download item by ID to .cms.md file
  publish <file>             Publish local changes to BaseHub
  delete <file>              Delete from BaseHub + remove local file
  upload <image>             Upload image to BaseHub CDN
  list [collection]          List items (optionally filter by collection)

Collections:
  posts      - Blog posts
  tutorials  - How-to tutorials
  updates    - Product updates

Cover Images:
  Add to frontmatter:
    coverImage: "/path/to/local/image.png"   (auto-uploads on publish)
    coverImage: "https://..."                (uses existing URL)

Examples:
  zocms new post 'My New Blog Post'
  zocms new tutorial 'How to Do Something'
  zocms upload ~/Downloads/cover.png
  zocms publish my-post.cms.md
  zocms list posts

Requires: BASEHUB_MCP_TOKEN in .env or environment
`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "new":
      if (!args[1] || !args[2]) {
        console.error("Usage: zocms new <collection> 'Title'");
        console.error("Collections: posts, tutorials, updates");
        process.exit(1);
      }
      await newItem(args[1], args[2]);
      break;
    case "download":
      if (!args[1]) {
        console.error("Usage: zocms download <id>");
        process.exit(1);
      }
      await download(args[1]);
      break;
    case "publish":
      if (!args[1]) {
        console.error("Usage: zocms publish <file.cms.md>");
        process.exit(1);
      }
      await publish(args[1]);
      break;
    case "delete":
      if (!args[1]) {
        console.error("Usage: zocms delete <file.cms.md>");
        process.exit(1);
      }
      await deleteItem(args[1]);
      break;
    case "upload":
      if (!args[1]) {
        console.error("Usage: zocms upload <image-path>");
        process.exit(1);
      }
      await upload(args[1]);
      break;
    case "list":
      await list(args[1]);
      break;
    default:
      console.log(HELP);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
