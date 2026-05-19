import { normalizeMenuCategory } from '../menuDisplay';
import { MENU_CATEGORY_ASSETS, STATIC_HERO_SLIDES } from '../../config/permanentAssets';

describe('permanent public media fixtures', () => {
  it('provides bundled hero slides when uploads are unavailable', () => {
    expect(STATIC_HERO_SLIDES.length).toBeGreaterThanOrEqual(2);
    for (const slide of STATIC_HERO_SLIDES) {
      expect(slide.variant.fallback).toMatch(/^\/static\/hero\/trbg-space-/);
      expect(slide.variant.webpSrcset).toContain('640w');
      expect(slide.variant.webpSrcset).toContain('1440w');
    }
  });

  it('adds menu category fallback images for known live menu categories', () => {
    const categories = [
      'Burgers & Sandwiches',
      'Wings & Tenders',
      'Salads',
      'Flatbread Pizza',
      'Sides',
      'Additions and Dressings',
      'Drinks',
      "Hershey's Ice Cream",
    ];

    for (const name of categories) {
      const normalized = normalizeMenuCategory({ id: name, name });
      expect(normalized.permanentHeroVariant?.fallback).toMatch(/^\/static\/menu\/.+-720\.webp$/);
    }
  });

  it('keeps all permanent menu asset entries renderable', () => {
    for (const variant of Object.values(MENU_CATEGORY_ASSETS)) {
      expect(variant.fallback).toContain('/static/menu/');
      expect(variant.webpSrcset).toContain('480w');
      expect(variant.webpSrcset).toContain('720w');
    }
  });
});
