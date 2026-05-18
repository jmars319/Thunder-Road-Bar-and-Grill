export const STATIC_HERO_META = {
  webpSrcset: [
    '/static/hero/hero-default-640.webp 640w',
    '/static/hero/hero-default-960.webp 960w',
    '/static/hero/hero-default-1x.webp 1440w',
    '/static/hero/hero-default-2x.webp 2880w'
  ].join(', '),
  jpgSrcset: [
    '/static/hero/hero-default-640.jpg 640w',
    '/static/hero/hero-default-960.jpg 960w',
    '/static/hero/hero-default-1x.jpg 1440w',
    '/static/hero/hero-default-2x.jpg 2880w'
  ].join(', '),
  fallbackSrc: '/static/hero/hero-default-1x.webp',
  width: 1440,
  height: 960,
  alt: 'Thunder Road Bar and Grill interior'
};

export const PERMANENT_ASSETS = {
  heroFallback: STATIC_HERO_META,
  openGraphImage: '/og/og-image-1200x630-with-badge.png'
};
