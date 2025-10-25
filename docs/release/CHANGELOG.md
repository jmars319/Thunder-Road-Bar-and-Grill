```markdown
# Changelog

Purpose:
- Human-readable changelog for the repository. Keep entries under `Unreleased`
	until they're promoted for a release. This file is intended for maintainers
	and release notes generation.

All notable changes to this project are documented below. This file follows a
simple human-readable format. Keep entries concise and place new changes under
`Unreleased` until you create a release.

## Unreleased - 2025-10-14

### Added
- `DEVELOPERS.md` — developer onboarding and reference for the frontend. Covers:
	- Theme tokens and runtime theming (ThemeContext)
	- Toast API (ToastContext)
	- Admin module registry/contract
	- Common API endpoints and testing instructions
	- Tailwind tokenization checklist

- `RELEASE_NOTES.md` — release note for this documentation-focused update.
- `CHANGELOG-RELEASE-ENTRY.md` — per-release entry file (for machine-assisted workflows).

### Changed
- Repository-wide inline annotations added to many frontend components and
	admin modules to clarify data shapes, API expectations, and accessibility
	requirements.
- `frontend/src/pages/LoginPage.js`: accessibility and UX improvements, including
	labeled inputs, `form` + `onSubmit`, aria-live error region, and defensive
	network handling.
- `frontend/src/pages/PublicSite.js`: added composition notes and accessibility
	suggestions (e.g. child components providing landmarks).

### Fixed
- `frontend/src/components/admin/NewsletterModule.js`: CSV export now wrapped
	in try/catch and delete failures log to console for easier debugging.

### Maintenance
- `DEVELOPERS.md` was added to consolidate onboarding information and common
	development commands.
- Tests run: `cd frontend && npm test -- --watchAll=false` — PASS (representative test).

---

For a detailed file-by-file summary, see the commit history or `git log`.

``` 
