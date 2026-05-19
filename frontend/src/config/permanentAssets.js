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

function buildStaticHeroSlide(slug, alt = STATIC_HERO_META.alt) {
  return {
    id: `static-${slug}`,
    alt,
    variant: {
      webpSrcset: [
        `/static/hero/trbg-${slug}-640.webp 640w`,
        `/static/hero/trbg-${slug}-960.webp 960w`,
        `/static/hero/trbg-${slug}-1440.webp 1440w`
      ].join(', '),
      optimizedSrcset: '',
      fallback: `/static/hero/trbg-${slug}-960.webp`,
      sizes: '100vw',
      width: 1440,
      height: 960
    }
  };
}

function buildMenuImage(slug, alt) {
  return {
    alt,
    fallback: `/static/menu/${slug}-720.webp`,
    optimizedSrcset: '',
    webpSrcset: [
      `/static/menu/${slug}-480.webp 480w`,
      `/static/menu/${slug}-720.webp 720w`
    ].join(', '),
    sizes: '(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 96px), (max-width: 1535px) 720px, 960px',
    width: 720,
    height: 180
  };
}

export const STATIC_HERO_SLIDES = [
  buildStaticHeroSlide('space-1'),
  buildStaticHeroSlide('space-2'),
  buildStaticHeroSlide('space-3'),
  buildStaticHeroSlide('space-4'),
  buildStaticHeroSlide('space-5'),
  buildStaticHeroSlide('space-6')
];

export const MENU_CATEGORY_ASSETS = {
  'burgers-and-sandwiches': buildMenuImage('burgers-and-sandwiches', 'Burgers and sandwiches'),
  'wings-and-tenders': buildMenuImage('wings-and-tenders', 'Wings and tenders'),
  salads: buildMenuImage('salads', 'Salads'),
  'flatbread-pizza': buildMenuImage('flatbread-pizza', 'Flatbread pizza'),
  sides: buildMenuImage('sides', 'Sides'),
  'additions-and-dressings': buildMenuImage('additions-and-dressings', 'Additions and dressings'),
  drinks: buildMenuImage('drinks', 'Drinks'),
  'hersheys-ice-cream': buildMenuImage('hersheys-ice-cream', "Hershey's Ice Cream")
};

export const PERMANENT_ASSETS = {
  heroFallback: STATIC_HERO_META,
  heroSlides: STATIC_HERO_SLIDES,
  menuCategoryAssets: MENU_CATEGORY_ASSETS,
  openGraphImage: '/og/og-image-1200x630-with-badge.png'
};
