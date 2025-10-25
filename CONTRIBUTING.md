# Contributing

Welcome — thanks for helping improve this project. This file collects the concrete, repeatable steps we expect from contributors so PR review is fast and low-friction.

Basic workflow
--------------
1. Fork the repository and create a feature branch with a clear name, e.g. `feat/menu-search` or `fix/navbar-padding`.
2. Make small, focused commits. Keep each commit message short and prefixed with a type (see "Commit messages").
3. Run linters and tests locally before pushing (see LINTING.md and FRONTEND-DEV.md for commands).
4. Push your branch and open a Pull Request against `main`. Use the PR template to fill in context and a checklist.

Commit messages
---------------
Use conventional-style prefixes to make the git log easy to scan:

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — build or tooling changes
- `docs:` — documentation only
- `style:` — formatting/whitespace only
- `refactor:` — code change that neither fixes a bug nor adds a feature

Keep subject lines under ~72 characters. Add a short multi-line body only when needed.

Pull request checklist
----------------------
- [ ] PR has a descriptive title and summary
- [ ] Commits are small and scoped
- [ ] Code compiles / app runs locally
- [ ] All unit tests pass
- [ ] Linting passes (JS + CSS) or issues are explicitly documented in the PR
- [ ] Screenshots included for UI changes (optional but helpful)

Review guidance for maintainers
------------------------------
- Prefer small, focused PRs — they are easier to review and less risky.
- For visual changes, ask the author to include screenshots and describe the verification steps.
- If a PR touches CSS class names or public component APIs, check for downstream usages across the repo.

Coding standards
----------------
- Follow project ESLint rules for JavaScript/JSX. Run `npm run lint` and `npm run lint:fix`.
- CSS is checked with stylelint; see `LINTING.md` for Tailwind-aware rules and how to run `npm run lint:css`.

Branching and releases
----------------------
- Work off `main` and open feature branches for each change.
- Release process is handled by maintainers; coordinate large changes over an issue first.

Thank you for contributing!

Last updated: 2025-10-25
