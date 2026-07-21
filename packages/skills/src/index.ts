import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface BundledSkill {
  name: string;
  description: string;
  tags: string[];
  content: string;
}

const here = dirname(fileURLToPath(import.meta.url));

function load(filename: string): string {
  return readFileSync(join(here, filename), "utf8");
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string | string[]>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return { frontmatter: {}, body: raw };
  }
  const fm: Record<string, string | string[]> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    // BUGFIX(plan): with noUncheckedIndexedAccess, m[1]/m[2] are string|undefined.
    const key = m[1];
    const value = m[2];
    if (key === undefined || value === undefined) continue;
    if (value.startsWith("[") && value.endsWith("]")) {
      fm[key] = value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      fm[key] = value;
    }
  }
  return { frontmatter: fm, body: match[2] };
}

export const bundledSkills: BundledSkill[] = [
  "connect-server.md",
  "run-command.md",
  "tunnel-setup.md",
  "sandbox-quickstart.md",
  "file-transfer.md",
  "skill-management.md",
].map((file) => {
  const raw = load(file);
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    name: String(frontmatter.name ?? file.replace(/\.md$/, "")),
    description: String(frontmatter.description ?? ""),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    content: body.trim(),
  };
});
