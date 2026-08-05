# ATTRIBUTION — stitch-skills

- **Source URL:** https://github.com/google-labs-code/stitch-skills
- **Upstream commit SHA:** `535b0889a46868c9b08f8a7f7084db3c1958a2b6`
- **Clone date:** 2026-08-05
- **License:** Apache License 2.0 (see `LICENSE`)
- **Upstream structure:** repo is organized as Codex/Claude/Cursor/OpenCode *plugins*
  under `plugins/<plugin>/skills/<skill-name>/SKILL.md`. Three plugins:
  `stitch-design`, `stitch-build`, `stitch-utilities`. The vendoring flattens
  the plugin namespace into a single vendor folder `skills/stitch-skills/`
  using each skill's own directory name as the skill folder.

## Copied skills (15)

| Folder | `name:` (frontmatter, verbatim) | Source plugin |
|---|---|---|
| `react-components/` | `stitch::react-components` | stitch-build |
| `react-native/` | `stitch::react-native` | stitch-build |
| `react-vite-dashboard/` | `react-vite-dashboard` | stitch-build |
| `remotion/` | `remotion` | stitch-build |
| `shadcn-ui/` | `shadcn-ui` | stitch-build |
| `code-to-design/` | `stitch::code-to-design` | stitch-design |
| `extract-design-md/` | `stitch::extract-design-md` | stitch-design |
| `extract-static-html/` | `stitch::extract-static-html` | stitch-design |
| `generate-design/` | `stitch::generate-design` | stitch-design |
| `manage-design-system/` | `stitch::manage-design-system` | stitch-design |
| `upload-to-stitch/` | `stitch::upload-to-stitch` | stitch-design |
| `design-md/` | `design-md` | stitch-utilities |
| `enhance-prompt/` | `enhance-prompt` | stitch-utilities |
| `stitch-loop/` | `stitch-loop` | stitch-utilities |
| `taste-design/` | `taste-design` | stitch-utilities |

For each skill the entire skill folder was copied verbatim (including
`SKILL.md`, `README.md`, `examples/`, `resources/`, `references/`,
`reference/`, `scripts/`, `package.json`, `package-lock.json`, and any other
supporting files). Frontmatter and skill body text are untouched.

## File count

- 15 `SKILL.md` files
- 75 files total under `skills/stitch-skills/` (excluding `ATTRIBUTION.md`
  and `LICENSE`)

## Notes

- The repo's plugin plumbing (`plugin.json`, `.codex-plugin/plugin.json`,
  `.agents/plugins/marketplace.json`, `.github/workflows/validate-skills.yml`,
  `CONTRIBUTING.md`, `README.md`, `SECURITY.md`, `.gitignore`) was intentionally
  NOT vendored — it is plugin-spawn metadata, not skill content.
- These are Google Stitch design-tool skills following the Agent Skills open
  standard; several describe a "baton-passing loop" / DESIGN.md design-system
  pattern (notably `stitch-loop`, `design-md`, `taste-design`, `enhance-prompt`).