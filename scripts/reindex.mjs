/**
 * reindex.mjs — sync the README "Loaded skills" tables with the actual skill
 * tree. Scans the skills dirs (builtin) and .agent-forge/skills dirs
 * (overlay) for SKILL.md files, then rewrites the table between the
 * NUCLEUS:SKILLS markers in both README.md and README.ru.md.
 *
 * Run: npm run reindex  (plain ESM — works on any Node >= 18)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const START = "<!-- NUCLEUS:SKILLS:START -->";
const END = "<!-- NUCLEUS:SKILLS:END -->";

async function scan(dir, overlay) {
  const rows = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return rows; // dir absent → no skills of this kind
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    let raw;
    try {
      raw = await readFile(join(dir, ent.name, "SKILL.md"), "utf8");
    } catch {
      continue; // no SKILL.md → not a skill dir
    }
    const desc =
      /^description:\s*(.+)$/m.exec(raw)?.[1]?.trim() ?? "_(no description)_";
    rows.push({ name: ent.name, description: desc, overlay });
  }
  return rows;
}

function table(rows) {
  if (rows.length === 0) {
    return (
      "| Skill | Description |\n" +
      "|-------|-------------|\n" +
      "| _none yet_ | _run `npm run reindex` after adding skills_ |"
    );
  }
  const head = "| Skill | Description |\n|-------|-------------|\n";
  const body = rows
    .map(
      (r) =>
        `| ${r.name}${r.overlay ? " _(overlay)_" : ""} | ${r.description} |`
    )
    .join("\n");
  return head + body;
}

function replaceBetween(markdown, tbl) {
  const a = markdown.indexOf(START);
  const b = markdown.indexOf(END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(`Missing ${START}/${END} markers in README`);
  }
  const seg = `${START}\n${tbl}\n${END}`;
  return markdown.slice(0, a) + seg + markdown.slice(b + END.length);
}

async function main() {
  const [builtin, overlay] = await Promise.all([
    scan(join(ROOT, "skills"), false),
    scan(join(ROOT, ".agent-forge", "skills"), true),
  ]);
  const rows = [...builtin, ...overlay];
  const tbl = table(rows);
  for (const f of ["README.md", "README.ru.md"]) {
    const p = join(ROOT, f);
    const md = await readFile(p, "utf8");
    await writeFile(p, replaceBetween(md, tbl), "utf8");
    console.log(`reindexed ${f} (${rows.length} skills)`);
  }
}

main().catch((e) => {
  console.error("reindex failed:", e);
  process.exit(1);
});