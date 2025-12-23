#!/usr/bin/env bun
/** zocms - BaseHub CLI for syncing content. See README.md for docs. */

const MCP_URL = "https://basehub.com/api/mcp";

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

async function query(gql: string): Promise<Record<string, unknown>> {
  const result = (await mcpCall("tools/call", "query_content", {
    query: gql,
    draft: false,
  })) as { content: { text: string }[] };
  const text = result.content?.[0]?.text;
  if (!text) throw new Error("No content in response");
  const parsed = JSON.parse(text);
  if (parsed.data) return parsed.data;
  return parsed;
}

const COLLECTIONS: Record<string, { path: string[]; bodyField: string }> = {
  posts: { path: ["blog", "posts", "items"], bodyField: "body" },
  tutorials: { path: ["tutorials", "tutorials", "items"], bodyField: "body" },
  "use-cases": { path: ["useCases", "useCases", "items"], bodyField: "body" },
  comparisons: {
    path: ["comparisons", "comparisons", "items"],
    bodyField: "body",
  },
  features: { path: ["features", "features", "items"], bodyField: "body" },
};

function getNested(obj: Record<string, unknown>, path: string[]): unknown[] {
  let result: unknown = obj;
  for (const key of path) {
    if (!result || typeof result !== "object") return [];
    result = (result as Record<string, unknown>)[key];
  }
  return Array.isArray(result) ? result : [];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 2)
    .join("-")
    .replace(/[^a-z0-9-]/g, "");
}

function toFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (typeof v === "string" && (v.includes("\n") || v.includes(":"))) {
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

async function list(collection: string) {
  const config = COLLECTIONS[collection];
  if (!config) {
    console.error(`Unknown collection: ${collection}`);
    console.error(`Available: ${Object.keys(COLLECTIONS).join(", ")}`);
    process.exit(1);
  }

  const gqlPath = config.path
    .slice(0, -1)
    .reduceRight((acc, key) => `${key} { ${acc} }`, `items { _id _title }`);
  const data = await query(`{ ${gqlPath} }`);
  const items = getNested(data, config.path) as {
    _id: string;
    _title: string;
  }[];

  console.log(`\n${collection.toUpperCase()} (${items.length})\n`);
  for (const item of items) {
    console.log(`${item._title.padEnd(50)} ${item._id}`);
  }
  console.log();
}

async function fetchItem(id: string): Promise<{
  name: string;
  item: Record<string, unknown>;
  bodyField: string;
} | null> {
  for (const [name, config] of Object.entries(COLLECTIONS)) {
    const gqlPath = config.path
      .slice(0, -1)
      .reduceRight(
        (acc, key) => `${key} { ${acc} }`,
        `items { _id _title _slug metaDescription ${config.bodyField} { markdown } }`,
      );

    try {
      const data = await query(`{ ${gqlPath} }`);
      const items = getNested(data, config.path) as Record<string, unknown>[];
      const item = items.find((i) => i._id === id);
      if (item) return { name, item, bodyField: config.bodyField };
    } catch {
      // Try next collection
    }
  }
  return null;
}

function itemToMarkdown(
  name: string,
  item: Record<string, unknown>,
  bodyField: string,
): string {
  const fm: Record<string, unknown> = {
    _id: item._id,
    _collection: name,
    _title: item._title,
  };
  if (item._slug) fm._slug = item._slug;
  if (item.metaDescription) fm.metaDescription = item.metaDescription;

  const bodyObj = item[bodyField] as { markdown?: string } | undefined;
  const body = bodyObj?.markdown || "";

  return `---\n${toFrontmatter(fm)}\n---\n\n${body}`;
}

async function get(id: string) {
  const result = await fetchItem(id);
  if (!result) {
    console.error(`Item not found: ${id}`);
    process.exit(1);
  }

  const { name, item, bodyField } = result;
  const title = item._title as string;
  const filename = `${slugify(title)}.md`;

  await Bun.write(filename, itemToMarkdown(name, item, bodyField));
  console.log(`Saved: ${filename}`);
}

async function refresh(filepath: string) {
  const raw = await Bun.file(filepath).text();
  const { fm } = parseFrontmatter(raw);

  const id = fm._id as string;
  if (!id) {
    console.error("Error: File must have _id in frontmatter");
    process.exit(1);
  }

  const result = await fetchItem(id);
  if (!result) {
    console.error(`Item not found: ${id}`);
    process.exit(1);
  }

  const { name, item, bodyField } = result;
  await Bun.write(filepath, itemToMarkdown(name, item, bodyField));
  console.log(`Refreshed: ${filepath}`);
}

async function push(filepath: string) {
  const raw = await Bun.file(filepath).text();
  const { fm, body } = parseFrontmatter(raw);

  const id = fm._id as string;
  if (!id) {
    console.error("Error: File must have _id in frontmatter");
    process.exit(1);
  }

  const collection = fm._collection as string;
  const config = collection ? COLLECTIONS[collection] : null;
  const bodyField = config?.bodyField || "body";

  const value: Record<string, unknown> = {};

  if (fm.metaDescription) {
    value.metaDescription = { type: "text", value: fm.metaDescription };
  }

  if (body.trim()) {
    value[bodyField] = {
      type: "rich-text",
      value: { format: "markdown", value: body },
    };
  }

  const updateData: Record<string, unknown> = { id, value };
  if (fm._title) updateData.title = fm._title;

  const title = (fm._title as string) || "content";
  const commitMsg = `Update ${title}`;

  await mcpCall("tools/call", "update_blocks", {
    data: [updateData],
    autoCommit: commitMsg,
  });
  console.log(`Published: ${title}`);
}

// Get the install directory (where this CLI is installed from)
function getInstallDir(): string {
  const scriptPath = import.meta.url.replace("file://", "");
  return scriptPath.substring(0, scriptPath.lastIndexOf("/"));
}

async function update() {
  const installDir = getInstallDir();
  console.log(`Updating from: ${installDir}`);

  const proc = Bun.spawn(["sh", "-c", "git pull && bun link"], {
    cwd: installDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode === 0) {
    console.log("\n✓ Updated successfully!");
  } else {
    console.error("\n✗ Update failed");
    process.exit(1);
  }
}

const HELP = `zocms - BaseHub CLI

Commands:
  list <collection>   List items (posts, tutorials, use-cases, comparisons, features)
  get <id>            Download item → slug.md
  push <file.md>      Push and publish
  refresh <file.md>   Pull latest (overwrites local)
  update              Update CLI from source

Requires: export BASEHUB_MCP_TOKEN="..."
Docs: https://github.com/benguo/zo-basehub
`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "list":
      if (!args[1]) {
        console.error("Usage: zocms list <collection>");
        process.exit(1);
      }
      await list(args[1]);
      break;
    case "get":
      if (!args[1]) {
        console.error("Usage: zocms get <id>");
        process.exit(1);
      }
      await get(args[1]);
      break;
    case "push":
      if (!args[1]) {
        console.error("Usage: zocms push <file.md>");
        process.exit(1);
      }
      await push(args[1]);
      break;
    case "refresh":
      if (!args[1]) {
        console.error("Usage: zocms refresh <file.md>");
        process.exit(1);
      }
      await refresh(args[1]);
      break;
    case "update":
      await update();
      break;
    default:
      console.log(HELP);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
