/**
 * RichTextField invariants:
 * - contentEditable stays uncontrolled while focused (no mid-typing rewrites)
 * - sanitize/commit happens on blur or external value changes only; PHP HtmlSanitizer is authoritative
 * - toolbar actions use onMouseDown + preventDefault + selection restore for stability
 * - allowed markup <p>, <strong>, <em>, <br>, <ul>, <ol>, <li> (no attributes)
 * - editor content is always read/written via innerHTML (never textContent)
 */
import { useEffect, useRef, useState, useCallback, useMemo, useId } from 'react';
import { sanitizeRichText } from '../../utils/richText';
import { icons } from '../../icons';

const PLAIN_TEXT_LINE_BREAK = /(?:\r\n|\r|\n)/g;
const SYMBOL_GROUPS = [
  { label: 'Arrows', items: ['↓', '↑', '→', '←', '↘', '↗', '↙', '↖', '⇢', '⇠'] },
  { label: 'Markers', items: ['•', '◦', '‣', '▪', '▫', '◆', '◇', '★', '☆'] },
  { label: 'Checks & Alerts', items: ['✓', '✔', '✗', '✕', '!', '⚠'] },
  { label: 'Currency', items: ['$', '€', '£', '¥'] },
  { label: 'Misc', items: ['™', '®', '©', '°', '·', '…', '—'] }
];
const RECENT_SYMBOLS_KEY = 'trbg_richtext_recent_symbols';
const MAX_RECENT_SYMBOLS = 8;
const DOUBLE_LINE_BREAK = /\r?\n\s*\r?\n/;

const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPlainHtmlFromText = (text = '') => {
  if (!text) return '';
  const paragraphs = text.split(DOUBLE_LINE_BREAK);
  const htmlSegments = paragraphs.map((block) => {
    const lines = block.split(PLAIN_TEXT_LINE_BREAK).map((line) => escapeHtml(line));
    const inner =
      lines
        .map((line) => (line.length === 0 ? '<br>' : line))
        .join('<br>')
        .replace(/(?:<br>)+$/, '') || '<br>';
    return `<p>${inner}</p>`;
  });
  return htmlSegments.join('');
};

const hasMeaningfulContent = (htmlString = '') =>
  htmlString
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .trim().length > 0;

export default function RichTextField({ label, value = '', onChange, helperText, id }) {
  const debugEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      return new URLSearchParams(window.location.search).has('debug');
    } catch (error) {
      return false;
    }
  }, []);
  const editorRef = useRef(null);
  const isFocusedRef = useRef(false);
  const pendingHtmlRef = useRef(value || '');
  const selectionRef = useRef(null);
  const [html, setHtml] = useState(value || '');
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [recentSymbols, setRecentSymbols] = useState([]);
  const columnsHintTimeout = useRef(null);
  const [columnsHint, setColumnsHint] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(!hasMeaningfulContent(value));
  const generatedId = useId();
  const editorId = id || generatedId;
  const labelId = label ? `${editorId}-label` : undefined;
  const helperId = helperText ? `${editorId}-helper` : undefined;
  const unsavedId = isDirty ? `${editorId}-unsaved` : undefined;
  const columnsHintId = columnsHint ? `${editorId}-columns-hint` : undefined;
  const describedBy = [helperId, unsavedId, columnsHintId].filter(Boolean).join(' ') || undefined;
  const symbolsMenuId = `${editorId}-symbols-menu`;
  const columnsMenuId = `${editorId}-columns-menu`;

  useEffect(() => {
    const next = value || '';
    if (!isFocusedRef.current) {
      setHtml(next);
      pendingHtmlRef.current = next;
      if (editorRef.current && editorRef.current.innerHTML !== next) {
        editorRef.current.innerHTML = next;
      }
      setIsDirty(false);
      setShowPlaceholder(!hasMeaningfulContent(next));
    }
  }, [value]);

  useEffect(() => {
    try {
      const stored = window?.localStorage?.getItem(RECENT_SYMBOLS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSymbols(parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT_SYMBOLS));
        }
      }
    } catch (error) {
      // Ignore storage errors; operate without persistence.
    }
  }, []);

  useEffect(() => () => {
    if (columnsHintTimeout.current) {
      clearTimeout(columnsHintTimeout.current);
    }
  }, []);

  const persistRecentSymbols = useCallback((symbols) => {
    try {
      window?.localStorage?.setItem(RECENT_SYMBOLS_KEY, JSON.stringify(symbols));
    } catch (error) {
      // Ignore persistence failures.
    }
  }, []);

  const addRecentSymbol = useCallback(
    (symbol) => {
      setRecentSymbols((prev) => {
        const next = [symbol, ...prev.filter((item) => item !== symbol)].slice(0, MAX_RECENT_SYMBOLS);
        persistRecentSymbols(next);
        return next;
      });
    },
    [persistRecentSymbols]
  );

  const saveSelection = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    if (!editorRef.current || !selectionRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }, []);

  const updateContentFlags = useCallback(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML || '';
    setIsDirty(currentHtml !== html);
    setShowPlaceholder(!hasMeaningfulContent(currentHtml));
  }, [html]);

  const getListAncestor = useCallback(
    (node) => {
      let current = node;
      while (current && current !== editorRef.current) {
        if (
          current.nodeType === Node.ELEMENT_NODE &&
          (current.nodeName === 'UL' || current.nodeName === 'OL')
        ) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    },
    [editorRef]
  );

  const placeCaretOnNode = useCallback(
    (node) => {
      const selection = window.getSelection();
      if (!selection || !node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      saveSelection();
    },
    [saveSelection]
  );

  const showColumnsHint = useCallback((message) => {
    if (columnsHintTimeout.current) {
      clearTimeout(columnsHintTimeout.current);
    }
    setColumnsHint(message);
    columnsHintTimeout.current = setTimeout(() => setColumnsHint(''), 2500);
  }, []);

  const applyListCommand = useCallback((listTag) => {
    if (!editorRef.current) return false;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return false;
    }

    const listEl = document.createElement(listTag);
    const appendLi = (node) => {
      const li = document.createElement('li');
      if (node) {
        if (node.nodeType === Node.ELEMENT_NODE && ['P', 'DIV', 'LI'].includes(node.nodeName)) {
          while (node.firstChild) {
            li.appendChild(node.firstChild);
          }
        } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
          li.appendChild(node);
        }
      }
      if (!li.hasChildNodes()) {
        li.appendChild(document.createElement('br'));
      }
      listEl.appendChild(li);
    };

    const ensureSelectionSaved = () => {
      const focusTarget = listEl.querySelector('li:last-child') || listEl;
      const newRange = document.createRange();
      newRange.selectNodeContents(focusTarget);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      pendingHtmlRef.current = editorRef.current.innerHTML || '';
      saveSelection();
    };

    const findBlockElement = (node) => {
      let current = node;
      while (current && current !== editorRef.current) {
        if (current.nodeType === Node.ELEMENT_NODE && ['P', 'DIV', 'LI'].includes(current.nodeName)) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    };

    if (range.collapsed) {
      const block = findBlockElement(range.startContainer);
      if (block && block !== editorRef.current) {
        appendLi(block.cloneNode(true));
        block.replaceWith(listEl);
        ensureSelectionSaved();
        return true;
      }
    }

    const fragment = range.cloneContents();
    const nodes = fragment.childNodes.length ? Array.from(fragment.childNodes) : [];
    if (!nodes.length) {
      appendLi(null);
    } else {
      nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') {
          return;
        }
        appendLi(node);
      });
      if (!listEl.childNodes.length) {
        appendLi(null);
      }
    }

    range.deleteContents();
    range.insertNode(listEl);
    ensureSelectionSaved();
    updateContentFlags();
    return true;
  }, [saveSelection, updateContentFlags]);

  const applyColumnWrapper = useCallback(
    (columnCount) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      restoreSelection();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        showColumnsHint('Select a list to use columns');
        return;
      }
      const listNode = getListAncestor(selection.getRangeAt(0).commonAncestorContainer);
      if (!listNode) {
        showColumnsHint('Select a list to use columns');
        return;
      }
      const desiredClass =
        columnCount === 2 ? 'rt-cols-2' : columnCount === 3 ? 'rt-cols-3' : null;
      let wrapper = listNode.parentElement;
      const wrapperClass = (wrapper && wrapper.getAttribute && wrapper.getAttribute('class')) || '';
      const hasWrapper =
        wrapper &&
        wrapper.nodeType === Node.ELEMENT_NODE &&
        wrapper.tagName === 'DIV' &&
        ['rt-cols-2', 'rt-cols-3'].includes(wrapperClass.trim());

      if (!desiredClass) {
        if (hasWrapper && wrapper.parentNode) {
          wrapper.parentNode.insertBefore(listNode, wrapper);
          wrapper.parentNode.removeChild(wrapper);
          placeCaretOnNode(listNode);
          pendingHtmlRef.current = editorRef.current.innerHTML || '';
          updateContentFlags();
        }
        return;
      }

      if (hasWrapper) {
        if (wrapperClass.trim() !== desiredClass) {
          wrapper.setAttribute('class', desiredClass);
        }
      } else {
        const newWrapper = document.createElement('div');
        newWrapper.setAttribute('class', desiredClass);
        if (wrapper) {
          wrapper.insertBefore(newWrapper, listNode);
          newWrapper.appendChild(listNode);
          wrapper = newWrapper;
        }
      }

      placeCaretOnNode(listNode);
      pendingHtmlRef.current = editorRef.current.innerHTML || '';
      updateContentFlags();
    },
    [editorRef, getListAncestor, placeCaretOnNode, restoreSelection, showColumnsHint, updateContentFlags]
  );

  const applyToolbarCommand = useCallback(
    (command) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      if (command === 'clear') {
        editorRef.current.innerHTML = '';
        pendingHtmlRef.current = '';
        saveSelection();
        updateContentFlags();
        return;
      }
      if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
        restoreSelection();
        applyListCommand(command === 'insertUnorderedList' ? 'ul' : 'ol');
        return;
      }
      restoreSelection();
      document.execCommand(command, false, null);
      pendingHtmlRef.current = editorRef.current.innerHTML || '';
      saveSelection();
      updateContentFlags();
    },
    [applyListCommand, restoreSelection, saveSelection, updateContentFlags]
  );

  const handleFocus = () => {
    isFocusedRef.current = true;
    setEditorFocused(true);
    saveSelection();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    setEditorFocused(false);
    const current = editorRef.current?.innerHTML || '';
    const sanitized = sanitizeRichText(current);
    pendingHtmlRef.current = sanitized;
    setHtml(sanitized);
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitized;
    }
    setIsDirty(false);
    setShowPlaceholder(!hasMeaningfulContent(sanitized));
    if (debugEnabled) {
      // eslint-disable-next-line no-console
      console.debug('[richtext:commit]', { field: id || label || 'unknown', html: sanitized });
    }
    if (typeof onChange === 'function') {
      onChange(sanitized);
    }
  };

  const handleInput = () => {
    pendingHtmlRef.current = editorRef.current?.innerHTML || '';
    updateContentFlags();
  };

  const insertAtCaret = useCallback((htmlString) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      document.execCommand('insertHTML', false, htmlString);
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(htmlString);
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection();
  }, [saveSelection]);

  const insertPlainTextAtCaret = useCallback(
    (text) => {
      if (!editorRef.current || !text) return;
      editorRef.current.focus();
      const selection = window.getSelection();
      let range = null;
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
          range = null;
        }
      }
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      saveSelection();
      pendingHtmlRef.current = editorRef.current.innerHTML || '';
      updateContentFlags();
    },
    [saveSelection, updateContentFlags]
  );

  const handlePaste = (event) => {
    event.preventDefault();
    const clipboard = event.clipboardData || window.clipboardData;
    if (!clipboard) return;
    const htmlData = clipboard.getData('text/html');
    const textData = clipboard.getData('text/plain');
    let content = '';
    if (htmlData) {
      content = sanitizeRichText(htmlData);
    } else if (textData) {
      const escaped = textData
        .split(PLAIN_TEXT_LINE_BREAK)
        .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br>');
      content = sanitizeRichText(`<p>${escaped}</p>`);
    }
    if (!content) return;
    insertAtCaret(content);
    pendingHtmlRef.current = editorRef.current?.innerHTML || '';
    updateContentFlags();
  };

  const handleToolbarMouseDown = (command) => (event) => {
    event.preventDefault();
    applyToolbarCommand(command);
  };

  const handleSymbolToggle = (event) => {
    event.preventDefault();
    setSymbolsOpen((prev) => !prev);
  };

  const handleSymbolInsert = (symbol) => (event) => {
    event.preventDefault();
    insertPlainTextAtCaret(symbol);
    addRecentSymbol(symbol);
    setSymbolsOpen(false);
  };

  const handleClearFormatting = (event) => {
    event.preventDefault();
    if (!editorRef.current) return;
    editorRef.current.focus();
    const textContent = editorRef.current.innerText || '';
    const normalizedHtml = buildPlainHtmlFromText(textContent);
    editorRef.current.innerHTML = normalizedHtml;
    pendingHtmlRef.current = normalizedHtml;
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.addRange(range);
    }
    saveSelection();
    updateContentFlags();
  };

  const handleColumnsMenuToggle = (event) => {
    event.preventDefault();
    setColumnsOpen((prev) => !prev);
  };

  const handleColumnSelection = (count) => (event) => {
    event.preventDefault();
    applyColumnWrapper(count);
    setColumnsOpen(false);
  };

  return (
    <div className="rich-text-field">
      {label && (
        <label htmlFor={editorId} id={labelId} className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2 mb-2 flex-wrap relative items-center rich-text-field__toolbar">
        <ToolbarButton icon={icons.Bold} label="Bold" onAction={handleToolbarMouseDown('bold')} />
        <ToolbarButton icon={icons.Italic} label="Italic" onAction={handleToolbarMouseDown('italic')} />
        <ToolbarButton
          icon={icons.List}
          label="Bullets"
          onAction={handleToolbarMouseDown('insertUnorderedList')}
        />
        <ToolbarButton
          icon={icons.ListOrdered}
          label="Numbered"
          onAction={handleToolbarMouseDown('insertOrderedList')}
        />
        <ToolbarButton icon={icons.Eraser} label="Clear All" onAction={handleToolbarMouseDown('clear')} />
        <ToolbarButton icon={icons.Wand2} label="Clear Formatting" onAction={handleClearFormatting} />
        <div className="relative">
          <ToolbarButton
            icon={icons.Navigation}
            label="Symbols"
            onAction={handleSymbolToggle}
            ariaHasPopup="menu"
            ariaExpanded={symbolsOpen}
            ariaControls={symbolsMenuId}
          />
          {symbolsOpen && (
            <div
              id={symbolsMenuId}
              className="absolute z-10 mt-1 w-64 max-h-64 overflow-auto rounded-md border border-border bg-surface shadow-lg"
              role="menu"
            >
              <div className="border-b border-divider last:border-b-0 p-2">
                <p className="text-xs font-semibold text-text-secondary mb-1">Recent</p>
                {recentSymbols.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {recentSymbols.map((symbol) => {
                      const insertHandler = handleSymbolInsert(symbol);
                      return (
                        <button
                          key={`recent-${symbol}`}
                          type="button"
                          onMouseDown={insertHandler}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') insertHandler(event);
                          }}
                          aria-label={`Insert ${symbol}`}
                          className="px-2 py-1 text-sm rounded border border-divider bg-surface hover:bg-surface-warm"
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">Insert symbols to build recents</p>
                )}
              </div>
              {SYMBOL_GROUPS.map((group) => (
                <div key={group.label} className="border-b border-divider last:border-b-0 p-2">
                  <p className="text-xs font-semibold text-text-secondary mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((symbol) => {
                      const insertHandler = handleSymbolInsert(symbol);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          onMouseDown={insertHandler}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') insertHandler(event);
                          }}
                          aria-label={`Insert ${symbol}`}
                          className="px-2 py-1 text-sm rounded border border-divider bg-surface hover:bg-surface-warm"
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            icon={icons.LayoutDashboard}
            label="Columns"
            onAction={handleColumnsMenuToggle}
            ariaHasPopup="menu"
            ariaExpanded={columnsOpen}
            ariaControls={columnsMenuId}
          />
          {columnsOpen && (
            <div
              id={columnsMenuId}
              className="absolute z-10 mt-1 w-60 rounded-md border border-border bg-surface shadow-lg"
              role="menu"
            >
              <div className="px-3 py-2 text-xs uppercase text-text-secondary tracking-wide">Columns</div>
              {[1, 2, 3].map((count) => {
                const columnHandler = handleColumnSelection(count);
                return (
                  <button
                    key={count}
                    type="button"
                    onMouseDown={columnHandler}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') columnHandler(event);
                    }}
                    role="menuitem"
                    className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-warm"
                  >
                    {count === 1 ? 'Single column' : `${count} columns`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {isDirty && (
          <span
            id={unsavedId}
            className="rich-text-field__dirty text-xs font-semibold ml-auto"
            style={{ color: 'var(--warning-color)' }}
          >
            Unsaved
          </span>
        )}
      </div>
      {columnsHint && (
        <div id={columnsHintId} className="text-xs text-text-secondary mb-2" role="status" aria-live="polite">
          {columnsHint}
        </div>
      )}
      <div className={`rich-text-field__editor-wrapper ${editorFocused ? 'is-focused' : ''}`}>
        {showPlaceholder && !editorFocused && (
          <div className="rich-text-field__placeholder" aria-hidden="true">Type here…</div>
        )}
        <div
          id={editorId}
          ref={editorRef}
          className={`rich-text-field__editor ${editorFocused ? 'is-focused' : ''}`}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-label={label ? undefined : 'Rich text editor'}
          aria-describedby={describedBy}
          tabIndex={0}
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: html }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          onMouseUp={() => {
            saveSelection();
            updateContentFlags();
          }}
          onKeyUp={() => {
            saveSelection();
            updateContentFlags();
          }}
        />
      </div>
      {helperText && (
        <p id={helperId} className="text-xs text-text-secondary mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

function ToolbarButton({ icon: IconComponent, label, onAction, ariaHasPopup, ariaExpanded, ariaControls }) {
  const handleMouseDown = (event) => {
    if (typeof onAction === 'function') {
      event.preventDefault();
      onAction(event);
    }
  };

  const handleKeyDown = (event) => {
    if (!onAction) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAction(event);
    }
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      title={label}
      className="px-2 py-1 text-xs rounded border border-divider bg-surface hover:bg-surface-warm flex items-center gap-1"
      aria-label={label}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      {IconComponent ? <IconComponent size={14} /> : null}
      <span>{label}</span>
    </button>
  );
}
