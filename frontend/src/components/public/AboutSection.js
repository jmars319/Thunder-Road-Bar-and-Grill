/*
  AboutSection

  Purpose:
  - Render editable 'About' content pulled from the backend.

  Contract:
  - Expects GET /api/about returning an object with header, paragraph, and an optional map URL.

  Security note:
  - Sanitize any rich HTML from the backend before rendering to avoid XSS. This
    component renders plain text from the `about` payload and is intentionally
    conservative.
*/

import React, { useEffect, useMemo, useState } from 'react';
import cachedFetch from '../../lib/cachedFetch';
import { icons } from '../../icons';
import { getApiUrl } from '../../config/api';
import { sanitizeRichText } from '../../utils/richText';

function buildMapsEmbedUrlFromAddress(address) {
  if (!address) return null;
  // Use the public embed query parameter which doesn't require an API key.
  // Example: https://www.google.com/maps?q=1600+Amphitheatre+Parkway&output=embed
  const q = encodeURIComponent(address.trim());
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

export default function AboutSection() {
  // NOTE: This component uses `bg-surface` and `bg-surface-warm` tokens for
  // panels and page background. Edit tokens in `custom-styles.css` for global
  // changes (preferred) rather than in-component literal utilities.
  // DEV: Keep panel/background colors tokenized so runtime theming and
  // accessibility adjustments remain centralized. Avoid inline hex or
  // Tailwind color shades here; update `frontend/src/custom-styles.css`.
  const [about, setAbout] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [mapActive, setMapActive] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    // Fetch both about and site-settings so we can fall back to an address
    // if the admin updated the business address rather than a full embed URL.
    const load = async () => {
      try {
        const [aboutRes, siteRes] = await Promise.all([
          fetch(getApiUrl('/about')).then(r => r.ok ? r.json() : null).catch(() => null),
          cachedFetch(getApiUrl('/settings')).catch(() => null)
        ]);

        setAbout(aboutRes || null);
        setSiteSettings(siteRes?.settings || null);
      } catch {
        setAbout(null);
        setSiteSettings(null);
      }
    };

    load();
  }, []);

  const safeParagraph = useMemo(() => sanitizeRichText(about?.paragraph || ''), [about?.paragraph]);

  const mapInfo = useMemo(() => {
    if (!about && !siteSettings) return null;
    const raw = about?.map_embed_url;
    let embedSrc = null;
    let isUrl = false;
    if (raw) {
      const trimmed = String(raw).trim();
      if (/^https?:\/\//i.test(trimmed)) {
        embedSrc = trimmed;
        isUrl = true;
      } else {
        embedSrc = buildMapsEmbedUrlFromAddress(trimmed);
      }
    } else if (siteSettings?.address) {
      embedSrc = buildMapsEmbedUrlFromAddress(siteSettings.address);
    }
    if (!embedSrc) return null;

    let destinationUrl = embedSrc;
    try {
      if (/\/maps\/embed/i.test(embedSrc)) {
        destinationUrl = embedSrc.replace('/embed?', '/?');
      } else if (/\boutput=embed\b/i.test(embedSrc)) {
        destinationUrl = embedSrc.replace(/&?output=embed/i, '');
      }
    } catch (e) {
      destinationUrl = embedSrc;
    }

    let placeId = null;
    try {
      const m1 = embedSrc.match(/[?&]place_id=([^&]+)/i);
      const m2 = embedSrc.match(/query=place_id:([^&]+)/i);
      if (m1 && m1[1]) placeId = decodeURIComponent(m1[1]);
      else if (m2 && m2[1]) placeId = decodeURIComponent(m2[1]);
    } catch (e) {
      placeId = null;
    }

    let directionsUrl;
    if (placeId) {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=place_id:${encodeURIComponent(placeId)}`;
    } else if (siteSettings?.address) {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(siteSettings.address)}`;
    } else {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationUrl || '')}`;
    }

    const previewQuery = siteSettings?.address || (!isUrl && raw ? raw : '');

    return { embedSrc, destinationUrl, directionsUrl, previewQuery };
  }, [about, siteSettings]);

  const staticMapKey = process.env.REACT_APP_GOOGLE_STATIC_MAPS_KEY || '';
  const previewUrl = useMemo(() => {
    if (!mapInfo?.previewQuery || !staticMapKey) return null;
    const encoded = encodeURIComponent(mapInfo.previewQuery);
    return `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=15&size=600x360&scale=2&maptype=roadmap&markers=color:red|${encoded}&key=${staticMapKey}`;
  }, [mapInfo, staticMapKey]);

  useEffect(() => {
    setMapActive(false);
    setPreviewFailed(false);
  }, [mapInfo?.embedSrc]);

  return (
  <div id="about" className="py-12 bg-surface-warm">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-heading font-bold text-center mb-2">{about?.header || 'About Us'}</h2>
  <div className="bg-surface rounded-lg shadow-lg px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
            <div className="h-full md:col-span-3 pr-0 md:pr-4 md:pl-0">
              <div
                className="text-text-secondary mb-3 richtext-html"
                dangerouslySetInnerHTML={{ __html: safeParagraph }}
              />
            </div>

            <div className="h-full md:col-span-2 pl-0 md:pl-4 flex flex-col">
              {mapInfo && (
                <div className="mt-0 flex flex-col h-full gap-4 items-center md:items-end">
                  <div className="w-full flex justify-center md:justify-end">
                    <div className="rounded shadow-sm border border-divider overflow-hidden" style={{ width: 340, height: 340 }}>
                      {mapActive ? (
                        <iframe
                          src={mapInfo.embedSrc}
                          title="Location"
                          className="w-full h-full border-0"
                          allowFullScreen
                          loading="lazy"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMapActive(true)}
                          className="relative w-full h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                          {previewUrl && !previewFailed ? (
                            <img
                              src={previewUrl}
                              alt="Map preview"
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={() => setPreviewFailed(true)}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand/70 to-brand-dark/70" />
                          )}
                          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-text-inverse px-6 text-center gap-3">
                            {React.createElement(icons.MapPin, { size: 36 })}
                            <div>
                              <p className="font-semibold text-lg">See the map</p>
                              <p className="text-sm text-text-inverse/80">Click to load the interactive Google Map.</p>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full justify-center md:justify-end">
                    <a
                      href={mapInfo.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-text-inverse py-2 rounded-lg hover:bg-primary-dark transition font-semibold"
                    >
                      {React.createElement(icons.MapPin, { size: 18, className: 'inline-block' })}
                      <span>Go To</span>
                    </a>
                    <a
                      href={mapInfo.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-surface-warm text-text-primary py-2 rounded-lg hover:bg-surface hover:text-text-primary transition font-semibold"
                    >
                      {React.createElement(icons.Navigation, { size: 18, className: 'inline-block' })}
                      <span>Get Directions</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
