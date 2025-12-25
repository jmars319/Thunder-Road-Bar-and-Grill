const COLOR_REGEX = /rgba?\(([^)]+)\)/;

const toRgb = (value) => {
  if (!value) return [0, 0, 0];
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '');
    const bigint = parseInt(hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  const match = COLOR_REGEX.exec(trimmed);
  if (!match) return [0, 0, 0];
  return match[1].split(',').slice(0, 3).map((x) => Number(x.trim()));
};

const luminance = ([r, g, b]) => {
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const contrastRatio = (fg, bg) => {
  const lum1 = luminance(fg);
  const lum2 = luminance(bg);
  const [lighter, darker] = lum1 > lum2 ? [lum1, lum2] : [lum2, lum1];
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
};

export function logContrastPairs() {
  if (typeof window === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  const pairs = [
    ['Primary button', '--primary-color', '--text-inverse'],
    ['Secondary card', '--surface-color', '--text-primary'],
    ['Helper text', '--surface-color', '--text-secondary'],
    ['Placeholder', '--surface-color', '--text-placeholder'],
    ['Badge', '--primary-color', '--text-inverse'],
    ['Table text', '--surface-warm', '--text-primary']
  ];

  const rows = pairs.map(([label, bgVar, fgVar]) => {
    const bg = styles.getPropertyValue(bgVar).trim();
    const fg = styles.getPropertyValue(fgVar).trim();
    const ratio = contrastRatio(toRgb(fg), toRgb(bg));
    return { label, background: bg || bgVar, foreground: fg || fgVar, ratio };
  });

  // eslint-disable-next-line no-console
  console.table(rows);
  return rows;
}
