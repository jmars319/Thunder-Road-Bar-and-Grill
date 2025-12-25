const ALLOWED_TAGS = ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'div'];
const ALLOWED_DIV_CLASSES = ['rt-cols-2', 'rt-cols-3'];

export function sanitizeRichText(html = '') {
  if (typeof html !== 'string') return '';
  const trimmed = html.trim();
  if (!trimmed) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
  const container = doc.body.firstChild;
  if (!container) return '';

  const cleanNode = (node) => {
    const children = Array.from(node.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.includes(tag)) {
          if (child.childNodes.length) {
            while (child.firstChild) {
              node.insertBefore(child.firstChild, child);
            }
          }
          node.removeChild(child);
          return;
        }
        if (tag === 'div') {
          const classAttr = (child.getAttribute('class') || '').trim();
          const isAllowedClass = ALLOWED_DIV_CLASSES.includes(classAttr);
          if (!isAllowedClass) {
            while (child.firstChild) {
              node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
            return;
          }
          Array.from(child.attributes).forEach(attr => {
            if (attr.name !== 'class') child.removeAttribute(attr.name);
          });
        } else {
          while (child.attributes.length > 0) {
            child.removeAttribute(child.attributes[0].name);
          }
        }
        cleanNode(child);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child);
      }
    });
  };

  cleanNode(container);
  return container.innerHTML.trim();
}

export { ALLOWED_TAGS };
