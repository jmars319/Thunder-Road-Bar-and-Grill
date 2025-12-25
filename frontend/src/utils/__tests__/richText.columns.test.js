import { sanitizeRichText } from '../richText';

describe('sanitizeRichText column wrappers', () => {
  it('preserves allowed column wrapper classes', () => {
    const input = '<div class="rt-cols-2"><ul><li>One</li></ul></div>';
    expect(sanitizeRichText(input)).toBe('<div class="rt-cols-2"><ul><li>One</li></ul></div>');
  });

  it('strips unsupported classes from divs', () => {
    const input = '<div class="bad-class"><ul><li>One</li></ul></div>';
    expect(sanitizeRichText(input)).toBe('<ul><li>One</li></ul>');
  });
});
