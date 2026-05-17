/*
  usePaginatedResource.test.js

  Purpose:
  - Integration tests for `usePaginatedResource`, validating paginated fetch
    flows and reset behavior with a mocked IntersectionObserver.

  Notes:
  - Uses a small mock IntersectionObserver to keep tests deterministic.
*/
/* global globalThis */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import usePaginatedResource from './usePaginatedResource';

class MockIntersectionObserver {
  constructor() { MockIntersectionObserver.instances.push(this); }
  observe() {}
  disconnect() {}
}
MockIntersectionObserver.instances = [];

function TestComp({ base }) {
  const { items, total, fetchPage, reset } = usePaginatedResource(base, { limit: 2 });
  React.useEffect(() => {
    fetchPage(0, false).catch(() => {});
  }, [fetchPage]);
  return (
    <div>
      <div data-testid="total">{total ?? ''}</div>
      <ul>
        {items.map(i => <li key={i.id} data-testid="item">{i.title}</li>)}
      </ul>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

// Ensure TestComp is recognized by linters as used
const __usedTestComp = TestComp;
void __usedTestComp;

describe('usePaginatedResource (integration)', () => {
  const originalFetch = globalThis.fetch;
  beforeAll(() => {
    globalThis.IntersectionObserver = MockIntersectionObserver;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.IntersectionObserver;
  });

  test('fetches and resets', async () => {
    const fakeData = [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }];
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => '2' }, json: async () => fakeData });

    render(<TestComp base={'http://example/api?'} />);
    await waitFor(() => expect(screen.getAllByTestId('item')).toHaveLength(2));
    expect(screen.getByTestId('total').textContent).toBe('2');
    // click reset (wrap in act to avoid async update warnings)
    await act(async () => {
      screen.getByText('reset').click();
    });
    await waitFor(() => expect(screen.queryAllByTestId('item')).toHaveLength(0));
  });
});
