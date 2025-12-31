#!/usr/bin/env bun
/** zocms - Tutorial CLI for zo.computer. See README.md for docs. */

const MCP_URL = "https://basehub.com/api/mcp";

// BaseHub IDs
const TUTORIALS_PARENT_ID = "AKPiDEpK6mMxBjxDhXIze";
const TUTORIAL_COMPONENT_ID = "23abd95a28d73ca760243";
const BEN_AUTHOR_ID = "SbZsqGSzk8pcCBiIN227h";

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
    .replace(/^#+\s+.*/gm, "") // remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
    .replace(/[*_`]/g, "") // remove bold/italic/code markers
    .replace(/\n+/g, " ") // collapse newlines
    .trim();

  if (plain.length <= 300) return plain;

  // Get beginning, middle, and end snippets
  const snippetLen = 250;

  // Beginning: first ~60 chars, break at word
  const beginRaw = plain.slice(0, snippetLen);
  const beginSpace = beginRaw.lastIndexOf(" ");
  const begin = beginRaw.slice(0, beginSpace > 20 ? beginSpace : snippetLen);

  // Middle: around the center
  const midStart = Math.floor(plain.length / 2) - snippetLen / 2;
  const midRaw = plain.slice(midStart, midStart + snippetLen);
  const midFirstSpace = midRaw.indexOf(" ");
  const midLastSpace = midRaw.lastIndexOf(" ");
  const middle = midRaw.slice(
    midFirstSpace > 0 ? midFirstSpace + 1 : 0,
    midLastSpace > midFirstSpace ? midLastSpace : undefined
  );

  // End: last ~60 chars, break at word
  const endRaw = plain.slice(-snippetLen);
  const endSpace = endRaw.indexOf(" ");
  const end = endRaw.slice(endSpace > 0 ? endSpace + 1 : 0);

  return `${begin} … ${middle} … ${end}`;
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

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

async function newTutorial(title: string) {
  const slug = slugify(title);
  const filename = `${slug}.md`;

  // Check if file already exists
  if (await Bun.file(filename).exists()) {
    console.error(`Error: ${filename} already exists`);
    process.exit(1);
  }

  console.log(`Creating tutorial: ${title}`);
  console.log(`  slug: ${slug}`);

  // Create BaseHub entry
  const createData = {
    type: "instance",
    title: title,
    slug: slug,
    mainComponentId: TUTORIAL_COMPONENT_ID,
    value: {
      metaDescription: { type: "text", value: "" },
      date: { type: "date", value: today() },
      body: {
        type: "rich-text",
        value: { format: "markdown", value: "Write your tutorial here..." },
      },
      author: { type: "reference", value: BEN_AUTHOR_ID },
    },
  };

  await mcpCall("tools/call", "create_blocks", {
    parentId: TUTORIALS_PARENT_ID,
    data: [createData],
  });

  // Query for the created tutorial by slug to get its ID
  const findQuery = `{
    tutorials {
      tutorials {
        items {
          _id
          _slug
        }
      }
    }
  }`;

  const findResult = await query(findQuery);
  const allItems = (
    findResult.tutorials as { tutorials: { items: { _id: string; _slug: string }[] } }
  ).tutorials.items;

  const created = allItems.find((item) => item._slug === slug);
  if (!created) throw new Error("Created tutorial not found");
  const createdId = created._id;

  // Create local markdown file
  const fm = {
    _id: createdId,
    _slug: slug,
    title: title,
    metaDescription: "",
    date: today(),
  };

  const mdContent = `---\n${toFrontmatter(fm)}\n---\n\nWrite your tutorial here...\n`;
  await Bun.write(filename, mdContent);

  console.log(`\nCreated: ${filename}`);
  console.log(`BaseHub ID: ${createdId}`);
  console.log(`\nEdit the file, then run: zocms publish ${filename}`);
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

  const title = (fm.title as string) || "Untitled";
  console.log(`Publishing: ${title}`);

  const updateData: Record<string, unknown> = {
    id,
    title,
    value: {
      metaDescription: { type: "text", value: fm.metaDescription || "" },
      body: {
        type: "rich-text",
        value: { format: "markdown", value: body.trim() },
      },
    },
  };

  await mcpCall("tools/call", "update_blocks", {
    data: [updateData],
    autoCommit: `Update ${title}`,
  });

  console.log(`Published: ${title}`);
}

async function deleteTutorial(filepath: string) {
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

  // Delete from BaseHub
  await mcpCall("tools/call", "delete_blocks", {
    data: [{ id }],
    autoCommit: `Delete ${title}`,
  });

  // Delete local file
  await Bun.write(filepath, ""); // Clear contents first
  const fs = await import("fs/promises");
  await fs.unlink(filepath);

  console.log(`Deleted: ${filepath}`);
  console.log(`Removed from BaseHub: ${id}`);
}

async function list() {
  const gql = `{
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
  }`;

  const data = await query(gql);
  const items = (
    data.tutorials as { tutorials: { items: unknown[] } }
  ).tutorials.items as {
    _id: string;
    _title: string;
    _slug: string;
    body: { markdown: string };
  }[];

  console.log(`\nTUTORIALS (${items.length})\n`);

  for (const item of items) {
    const preview = excerpt(item.body?.markdown || "");
    console.log(item._title);
    console.log(`  slug: ${item._slug}`);
    console.log(`  ${preview}`);
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const HELP = `zocms - Tutorial CLI for zo.computer

Commands:
  new <title>       Create new tutorial (BaseHub + local .md)
  publish <file>    Publish local changes to BaseHub
  delete <file>     Delete from BaseHub + remove local file
  list              List all tutorials with previews

Examples:
  zocms new 'How to Do Something Cool'
  zocms publish how-to-do-something-cool.md
  zocms delete how-to-do-something-cool.md
  zocms list

Requires: BASEHUB_MCP_TOKEN in .env or environment
`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "new":
      if (!args[1]) {
        console.error("Usage: zocms new 'Title'");
        process.exit(1);
      }
      await newTutorial(args[1]);
      break;
    case "publish":
      if (!args[1]) {
        console.error("Usage: zocms publish <file.md>");
        process.exit(1);
      }
      await publish(args[1]);
      break;
    case "delete":
      if (!args[1]) {
        console.error("Usage: zocms delete <file.md>");
        process.exit(1);
      }
      await deleteTutorial(args[1]);
      break;
    case "list":
      await list();
      break;
    default:
      console.log(HELP);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
