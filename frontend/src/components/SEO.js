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

import { Helmet } from 'react-helmet-async';

export default function SEO({
  title,
  description,
  keywords = '',
  image = 'https://thunderroadbarandgrill.com/og/og-1200x627.png',
  url = '',
  type = 'website'
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

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
