import { render, fireEvent } from '@testing-library/react';
import RichTextField from '../RichTextField';

const getEditor = (container) => container.querySelector('[contenteditable="true"]');

const setCollapsedCaret = (node, offset = 0) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

const selectAllContent = (element) => {
  const selection = window.getSelection();
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.addRange(range);
};

describe('RichTextField list commands', () => {
  it('creates bullet list at caret and persists after blur', () => {
    const handleChange = jest.fn();
    const { container, getByLabelText } = render(
      <RichTextField id="desc" label="Description" value="<p>Make it a Combo</p>" onChange={handleChange} />
    );

    const editor = getEditor(container);
    fireEvent.focus(editor);

    const paragraph = editor.querySelector('p');
    const textNode = paragraph.firstChild;
    setCollapsedCaret(textNode, textNode.textContent.length);

    fireEvent.mouseDown(getByLabelText('Bullets'));

    expect(editor.innerHTML).toContain('<ul');
    fireEvent.blur(editor);
    expect(handleChange).toHaveBeenLastCalledWith(expect.stringContaining('<ul><li>Make it a Combo</li></ul>'));
  });

  it('wraps multi-paragraph selection inside ordered list', () => {
    const handleChange = jest.fn();
    const initialValue = '<p>First special</p><p>Second special</p>';
    const { container, getByLabelText } = render(
      <RichTextField id="menu" label="Menu entry" value={initialValue} onChange={handleChange} />
    );

    const editor = getEditor(container);
    fireEvent.focus(editor);
    selectAllContent(editor);

    fireEvent.mouseDown(getByLabelText('Numbered'));

    const listItems = editor.querySelectorAll('ol li');
    expect(listItems).toHaveLength(2);
    expect(listItems[0].textContent).toBe('First special');
    expect(listItems[1].textContent).toBe('Second special');

    fireEvent.blur(editor);
    expect(handleChange).toHaveBeenLastCalledWith(expect.stringContaining('<ol><li>First special</li><li>Second special</li></ol>'));
  });

  it('preserves inline formatting when converting selection to a list', () => {
    const handleChange = jest.fn();
    const initialValue = '<p>Try <strong>bold</strong> &amp; <em>italic</em></p>';
    const { container, getByLabelText } = render(
      <RichTextField id="menu" label="Menu entry" value={initialValue} onChange={handleChange} />
    );

    const editor = getEditor(container);
    fireEvent.focus(editor);
    selectAllContent(editor);

    fireEvent.mouseDown(getByLabelText('Bullets'));
    fireEvent.blur(editor);

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.stringContaining('<ul><li>Try <strong>bold</strong> &amp; <em>italic</em></li></ul>')
    );
  });
});
