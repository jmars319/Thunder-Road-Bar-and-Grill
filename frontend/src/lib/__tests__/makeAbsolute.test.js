/* eslint-env jest,node */
/* global require, afterAll */
const makeAbsolute = require('../makeAbsolute');

const OLD_API = process.env.REACT_APP_API_BASE;
process.env.REACT_APP_API_BASE = 'http://localhost:5001/api';

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
    expect(makeAbsolute('/uploads/img.png')).toBe('http://localhost:5001/uploads/img.png');
  });

  test('prepends base for paths missing leading slash', () => {
    expect(makeAbsolute('uploads/img.png')).toBe('http://localhost:5001/uploads/img.png');
  });
});
