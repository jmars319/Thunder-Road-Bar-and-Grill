import { normalizeJobStatus } from '../JobsModule';

describe('normalizeJobStatus', () => {
  test.each([
    ['new', 'new'],
    ['New', 'new'],
    [' pending ', 'new'],
    ['review', 'reviewing'],
    ['Reviewing', 'reviewing'],
    ['in_review', 'reviewing'],
    ['Interviewed', 'interviewed'],
    ['PHONE', 'interviewed'],
    ['Hired', 'hired'],
    ['Declined', 'rejected'],
    ['Withdrawn', 'archived'],
    [null, 'new'],
    ['', 'new'],
    ['unknown', 'new']
  ])('normalizes %p -> %p', (input, expected) => {
    expect(normalizeJobStatus(input)).toBe(expected);
  });
});
