---
name: skill-management
description: Create, list, and update markdown skills stored in gumpbox via the skills resource
tags: [skills, automation, memory]
---

# Manage skills

Use the `skills` MCP resource to create, list, and update procedural skills stored in gumpbox. Skills are markdown with YAML frontmatter.

## Steps

1. Call `list_resource_actions` with `resource: "skills"`.
2. To list existing skills: call `invoke_resource_action` with `resource: "skills"`, `action: "list"`, `{}`. Returns an array of `{ name, description, tags }`.
3. To create a new skill: call `action: "create"` with `{ name, description, content, tags }`. Content is the markdown body (no frontmatter — name/description/tags are separate params).
4. To update: call `action: "update"` with `{ name, content }`. Description and tags are optional patch fields.
5. To delete: call `action: "delete"` with `{ name }`.

## Tips

- Skill names are lowercase-kebab-case, unique per gumpbox instance.
- Tag skills with the resource they reference (e.g. `servers`, `terminal_use`) so they're easy to discover.
- The bundled starter skills (this package) are seeded on first plugin run via this same API — they're idempotent.
