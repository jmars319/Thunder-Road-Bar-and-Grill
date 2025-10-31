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

import React, { useEffect, useState } from 'react';
import cachedFetch from '../../lib/cachedFetch';
import { icons } from '../../icons';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

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

  useEffect(() => {
    // Fetch both about and site-settings so we can fall back to an address
    // if the admin updated the business address rather than a full embed URL.
    const load = async () => {
      try {
        const [aboutRes, siteRes] = await Promise.all([
          fetch(`${API_BASE}/about`).then(r => r.ok ? r.json() : null).catch(() => null),
          cachedFetch(`${API_BASE}/site-settings`).catch(() => null)
        ]);

        setAbout(aboutRes || null);
        setSiteSettings(siteRes || null);
      } catch {
        setAbout(null);
        setSiteSettings(null);
      }
    };

    load();
  }, []);

  return (
  <div id="about" className="py-12 bg-surface-warm">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-heading font-bold text-center mb-4">About Us</h2>
  <div className="bg-surface rounded-lg shadow-lg px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
            <div className="h-full md:col-span-3 pr-0 md:pr-4 md:pl-0">
              <h3 className="text-xl font-heading font-semibold mb-3 text-text-primary">{about?.header}</h3>
              <p className="text-text-secondary mb-3">{about?.paragraph}</p>
            </div>

            <div className="h-full md:col-span-2 pl-0 md:pl-4 flex flex-col">
              {(() => {
                // Determine the embed src. Priority:
                // 1) about.map_embed_url if it looks like a URL (starts with http)
                // 2) about.map_embed_url if it's a plain address string -> build embed URL
                // 3) siteSettings.address -> build embed URL
                const raw = about?.map_embed_url;
                let embedSrc = null;
                if (raw) {
                  const trimmed = String(raw).trim();
                  if (/^https?:\/\//i.test(trimmed)) {
                    embedSrc = trimmed;
                  } else {
                    // Treat as plain address
                    embedSrc = buildMapsEmbedUrlFromAddress(trimmed);
                  }
                } else if (siteSettings?.address) {
                  embedSrc = buildMapsEmbedUrlFromAddress(siteSettings.address);
                }

                if (!embedSrc) return null;

                // Build a destination URL suitable for opening in a new tab
                // Prefer converting embed URLs to their non-embed equivalents
                let destinationUrl = embedSrc;
                try {
                  if (/\/maps\/embed/i.test(embedSrc)) {
                    destinationUrl = embedSrc.replace('/embed?', '/?');
                  } else if (/\boutput=embed\b/i.test(embedSrc)) {
                    destinationUrl = embedSrc.replace(/&?output=embed/i, '');
                  }
                } catch (e) {
                  // fallback to embedSrc
                  destinationUrl = embedSrc;
                }

                // Try to extract a place_id from the embed URL if present.
                // Patterns to check: place_id=..., query=place_id:..., or a pb encoded !1s... token
                let placeId = null;
                try {
                  const m1 = embedSrc.match(/[?&]place_id=([^&]+)/i);
                  const m2 = embedSrc.match(/query=place_id:([^&]+)/i);
                  if (m1 && m1[1]) placeId = decodeURIComponent(m1[1]);
                  else if (m2 && m2[1]) placeId = decodeURIComponent(m2[1]);
                  else {
                    // Some embed URLs include a pb parameter with !1s<encoded> which isn't a place_id
                    // but could be a stable identifier — we won't treat it as place_id.
                    placeId = null;
                  }
                } catch (e) {
                  placeId = null;
                }

                // Build directions URL using place_id if available, otherwise fallback to address or destinationUrl
                let directionsUrl;
                if (placeId) {
                  directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=place_id:${encodeURIComponent(placeId)}`;
                } else if (siteSettings?.address) {
                  directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(siteSettings.address)}`;
                } else {
                  directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationUrl || '')}`;
                }

                return (
                  <div className="mt-0 md:mt-0 flex flex-col h-full">
                    <div className="flex-1 h-52 md:h-80">
                      <div className="w-full h-full bg-white border border-divider rounded shadow-sm overflow-hidden">
                        <iframe
                          src={embedSrc}
                          title="Location"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <a
                        href={destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-text-inverse py-2 rounded-lg hover:bg-primary-dark transition font-semibold"
                      >
                        {React.createElement(icons.MapPin, { size: 18, className: 'inline-block' })}
                        <span>Go To</span>
                      </a>
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-surface-warm text-text-primary py-2 rounded-lg hover:bg-surface hover:text-text-primary transition font-semibold"
                      >
                        {React.createElement(icons.Navigation, { size: 18, className: 'inline-block' })}
                        <span>Get Directions</span>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
