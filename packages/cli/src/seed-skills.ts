import { MCPClient, readSessionConfig } from "@gumpbox/core";
import { bundledSkills } from "@gumpbox/skills";

export async function seedSkills(): Promise<void> {
  const cfg = await readSessionConfig();
  if (!cfg) {
    process.stderr.write("Not configured — run `gumpbox set-url` first.\n");
    process.exit(1);
  }
  const client = new MCPClient(cfg);
  await client.initialize({ name: "gumpbox-cli", version: "0.0.0" });

  // Fetch existing skill names to make seeding idempotent.
  const listResult = await client.invokeResourceAction("skills", "list", {});
  const existingNames = new Set<string>();
  const content = (listResult as { content?: Array<{ text?: string }> }).content;
  if (content?.[0]?.text) {
    try {
      const parsed = JSON.parse(content[0].text) as Array<{ name?: string }>;
      for (const s of parsed) if (s.name) existingNames.add(s.name);
    } catch {}
  }

  let created = 0;
  let skipped = 0;
  for (const skill of bundledSkills) {
    if (existingNames.has(skill.name)) {
      skipped++;
      continue;
    }
    await client.invokeResourceAction("skills", "create", {
      name: skill.name,
      description: skill.description,
      content: skill.content,
      tags: skill.tags,
    });
    created++;
  }
  console.log(`Seeded ${created} skill(s), skipped ${skipped} existing.`);
}
