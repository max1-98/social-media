---
name: update-a-skill
description: The meta-skill. Use whenever you build or change a capability — create or update the matching SKILL.md and refresh the skills INDEX so skills stay a complete, trustworthy map of how we do things.
---

# update-a-skill

Our rule: **anytime we build something, we build or update a skill; when we edit
something, we edit its skill.** This keeps tacit knowledge captured and discoverable.

## When to use

- You added a new capability (endpoint, component, migration, tool, hook).
- You changed how an existing capability works.

## Steps

1. Decide if an existing skill covers this. If yes, **edit** that `SKILL.md` to
   match the new reality. If no, create `.claude/skills/<kebab-name>/SKILL.md`.
2. Frontmatter is required and must be accurate:
   ```
   ---
   name: <kebab-name>
   description: <when to use this skill, one or two sentences>
   ---
   ```
3. Body: concise, action-oriented steps. Link to the relevant rule files rather
   than restating them. Keep the file under 150 lines.
4. Update `.claude/skills/INDEX.md`: add/remove the `@`-reference line. The
   `index-sync` linter check fails if the index drifts.
5. Run `node scripts/lint/repo-lint.mjs` — frontmatter + index-sync must pass.

## Done when

The skill reflects current behaviour, the index references it, and the linter is
green.
