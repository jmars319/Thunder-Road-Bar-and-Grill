/*
  Purpose:
  - Reusable SEO component that sets dynamic meta tags for each page using
    react-helmet-async. Handles title, description, keywords, Open Graph,
    Twitter cards, and canonical URLs.

  Contract:
  - Inputs: 
    - title: string - Page title
    - description: string - Page description
    - keywords: string - Comma-separated keywords (optional)
    - image: string - Full URL to Open Graph image (optional)
    - url: string - Canonical URL (optional, defaults to current path)
    - type: string - Open Graph type (optional, defaults to "website")
  - Outputs: Renders <Helmet> with meta tags

  Notes:
  - Uses react-helmet-async for SSR compatibility
  - Automatically prepends site name to title
  - Falls back to default image if none provided
*/

// eslint-disable-next-line no-unused-vars
import { Helmet } from 'react-helmet-async';

const DEFAULT_OG_IMAGE = 'https://trbgmidway.com/og/og-image-1200x630-with-badge.png';
const DEFAULT_OG_IMAGE_SQUARE = 'https://trbgmidway.com/og/og-1024x1024.png';

function SEO({
  title = '',
  description = 'Thunder Road Bar & Grill — Midway, NC',
  keywords = 'Thunder Road, Bar and Grill, Midway NC, restaurant, bar, American food, live music',
  image = DEFAULT_OG_IMAGE,
  imageWidth = 1200,
  imageHeight = 630,
  imageSquare = DEFAULT_OG_IMAGE_SQUARE,
  imageSquareWidth = 1024,
  imageSquareHeight = 1024,
  url = '',
  type = 'website',
}) {
  const siteTitle = 'Thunder Road Bar & Grill — Midway, NC';
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
  const canonicalUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={imageWidth} />
      <meta property="og:image:height" content={imageHeight} />
      {imageSquare && imageSquare !== image && (
        <>
          <meta property="og:image" content={imageSquare} />
          <meta property="og:image:width" content={imageSquareWidth} />
          <meta property="og:image:height" content={imageSquareHeight} />
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}

export default SEO;
