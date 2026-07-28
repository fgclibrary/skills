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

## Current Skills

- `fgcapi-to-openapi`: convert a Forguncy API Excel workbook into OpenAPI 3.0 JSON for Apifox import
- `html-slides`: create standardized offline 16:9 HTML presentations with speaker notes and PDF export

## Adding A New Skill

1. Copy `template/skill-template/` to `skills/<new-skill-name>/`
2. Rename `SKILL.md.template` to `SKILL.md` and
   `agents/openai.yaml.template` to `agents/openai.yaml`
3. Replace every placeholder; the folder name and frontmatter `name` must match
4. Add `references/`, `assets/`, or `scripts/` only when the Skill needs them
5. Validate the metadata, bundled scripts, and representative output locally
6. Commit the new Skill as an isolated change
