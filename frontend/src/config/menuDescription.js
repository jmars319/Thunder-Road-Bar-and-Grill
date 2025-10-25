/*
	menuDescription.js

	Purpose:
	- Provide a build-time string used as the menu page description. Kept
		out of the database so small copy edits can be made at deploy time.

	Notes:
	- Replace the string below to change the public-facing menu blurb. For
		dynamic admin-editable copy, move this into `site-settings` and fetch
		at runtime instead.
*/
// Edit this string to change the description shown on the public menu page.
// This is intentionally kept out of the database and loaded at build time.

const MENU_DESCRIPTION = `Our kitchen serves scratch-made favorites with seasonal ingredients. Browse by category and tap a section to view details and prices. Please ask your server about allergies and availability.`;

export default MENU_DESCRIPTION;
