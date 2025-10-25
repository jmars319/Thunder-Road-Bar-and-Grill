```markdown
Release Notes — Thunder Road Frontend

Purpose:
- Brief release notes document for maintainers and release consumers. Use this
	file to summarize what a given release contains and any manual verification
	steps.

Release: Documentation & Developer Onboarding
Date: 2025-10-14
Commit: 642a17e (HEAD of main)

Summary
-------
This release contains repository-wide developer-facing documentation and
lightweight robustness improvements to the frontend. No breaking changes to
runtime behavior are included; the changes are focused on comments, accessibility
improvements, and small defensive fixes.

Highlights
---------
 - Added `../notes/DEVELOPERS.md` with a concise developer onboarding
	guide (theme tokens, ThemeContext, ToastContext, admin module contract,
	common API endpoints, testing commands, and a Tailwind tokenization checklist).
- Annotated many frontend files with human-friendly comments to help future
	maintainers understand data shapes, API expectations, and accessibility
	considerations. Notable edited files include:
	- `frontend/src/pages/AdminPanel.js`
	- `frontend/src/pages/LoginPage.js` (accessibility improvements: labels, form
		submit handler, aria-live error region)
	- `frontend/src/pages/PublicSite.js` (composition notes and lazy-load tip)
	- `frontend/src/components/admin/NewsletterModule.js` (CSV export notes,
		error logging when delete fails)
	- `frontend/src/contexts/ThemeContext.js` (detailed comments)
	- `frontend/src/contexts/ToastContext.js` (detailed comments)

- Small defensive improvements made:
	- Newsletter delete now logs failures to console for easier debugging.
	- CSV export wrapped with try/catch and documented caveats (simple escaping
		strategy, suggestion to use a CSV library for robust exports).
	- Login page form now uses a real `<form>` and proper `onSubmit` handling.

Verification / QA
-----------------
- Run the unit test: `cd frontend && npm test -- --watchAll=false` — status: PASS
- Manual checks recommended:
	- Verify admin panel loads and modules render (login -> admin panel if using
		local backend or mocked data).
	- Toggle theme (ThemeToggle) and verify CSS variables and contrast in both
		light and dark modes.
	- Export CSV from Newsletter admin and validate CSV opens in a spreadsheet app.

Rollback
--------
To revert these documentation-only and small robustness changes:

```bash
git revert 642a17e
git push origin main
```

Notes
-----
- This release does not change the backend API. If you intend to update
	endpoints or payload shapes, coordinate with backend changes in
	`backend/` and update the in-file comments in the frontend to reflect those
	new shapes.

``` 
