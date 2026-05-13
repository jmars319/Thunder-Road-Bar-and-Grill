/*
	Purpose:
	- Test setup for Jest + React Testing Library. This file imports helpers
		(like jest-dom) and runs before tests to extend matchers and provide
		a predictable test environment.

	Notes:
	- Keep only test-related setup here. Avoid importing heavy modules that
		slow down test runs.
*/

import '@testing-library/jest-dom';
import { vi } from 'vitest';

globalThis.jest = vi;
