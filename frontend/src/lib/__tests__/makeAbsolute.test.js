/*
  makeAbsolute.test.js

  Purpose:
  - Unit tests for the `makeAbsolute` helper that normalizes file URLs to an
    absolute API origin during development and runtime.

  Notes:
  - Keeps environment overrides local to the test and restores process env after.
*/
/* eslint-env jest,node */
import makeAbsolute from '../makeAbsolute';

const OLD_API = process.env.REACT_APP_API_BASE;
process.env.REACT_APP_API_BASE = 'http://localhost:3304/api';

describe('makeAbsolute', () => {
  afterAll(() => {
    process.env.REACT_APP_API_BASE = OLD_API;
  });

  test('returns empty string for falsy input', () => {
    expect(makeAbsolute(null)).toBe('');
    expect(makeAbsolute(undefined)).toBe('');
    expect(makeAbsolute('')).toBe('');
  });

  test('returns absolute URLs unchanged', () => {
    const url = 'https://example.com/uploads/img.png';
    expect(makeAbsolute(url)).toBe(url);
  });

  test('prepends base for leading-slash paths', () => {
    expect(makeAbsolute('/uploads/img.png')).toBe('http://localhost:3304/uploads/img.png');
  });

  test('prepends base for paths missing leading slash', () => {
    expect(makeAbsolute('uploads/img.png')).toBe('http://localhost:3304/uploads/img.png');
  });
});
