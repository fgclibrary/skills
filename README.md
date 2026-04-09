# Forguncy Skills

Reusable agent skills for the Forguncy low-code platform.

## Install

Install a specific skill with the `skills` CLI:

```bash
npx skills add https://github.com/fgclibrary/skills --skill <skill-name>
```

If the CLI supports shorthand repositories in your environment, this may also work:

```bash
npx skills add fgclibrary/skills --skill <skill-name>
```

Example:

```bash
npx skills add https://github.com/fgclibrary/skills --skill fgcapi-to-openapi
```

<br />

## Current Skills

- `fgcapi-to-openapi`: convert a Forguncy API Excel workbook into OpenAPI 3.0 JSON for Apifox import

## Adding A New Skill

1. Copy `template/skill-template/` to `skills/<new-skill-name>/`
2. Fill in `SKILL.md`
3. Add scripts or examples if needed
4. Test the skill locally
5. Commit the new skill as an isolated change
