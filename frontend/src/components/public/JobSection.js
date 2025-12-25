/*
  JobSection

  Purpose:
  - Public job application UI. Fetches open positions and optional dynamic
    application fields, allows applicants to submit a form and optionally add a resume/portfolio link.

  Contract:
  - Submits POST /api/jobs with form fields plus an optional resume_url string.

  Notes:
  - Performs client-side validation and focuses invalid fields for accessibility.
*/

import { useState, useRef, useEffect, useMemo } from 'react';
import Toast from '../ui/Toast';
import { sanitizeRichText } from '../../utils/richText';
import { getApiUrl } from '../../config/api';

// Public-facing job application form (frontend-only integration)
export default function JobSection() {
  const [positions, setPositions] = useState([]);
  const [hasOpenPositions, setHasOpenPositions] = useState(true);
  const [fields, setFields] = useState(null); // optional dynamic application fields from admin

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    availability: '',
    experience: '',
    cover_letter: '',
    resume_url: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const inputRefs = useRef({});
  const [copy, setCopy] = useState({
    success: '',
    failure: '',
    sidebarHeading: '',
    sidebarIntro: '',
    sidebarBenefits: '',
    positionsLabel: ''
  });
  const [hoveredPosition, setHoveredPosition] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    // clear inline field error for this field
    setFieldErrors((errs) => {
      if (!errs || !errs[name]) return errs;
      const next = { ...errs };
      delete next[name];
      return next;
    });
    setError(null);
    setMessage(null);
  }


  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      // Client-side validation
      const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your full name';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address';
    // Do not block submission if position is not selected — allow free-text or empty submissions per product decision
      // Phone simple validation (digits, spaces, dashes, parentheses)
      if (form.phone && !/^[0-9()+\-\s]+$/.test(form.phone)) errs.phone = 'Please enter a valid phone number';

      if (form.resume_url && form.resume_url.trim()) {
        const trimmed = form.resume_url.trim();
        if (!/^https?:\/\//i.test(trimmed)) {
          errs.resume_url = 'Enter the full URL (https://...)';
        } else if (trimmed.length > 255) {
          errs.resume_url = 'Resume link must be 255 characters or less';
        }
      }

      if (fields && Array.isArray(fields)) {
        // simple required check for dynamic fields
        fields.forEach(f => {
          if (f.required && !form[f.field_name]) {
            errs[f.field_name] = `${f.field_name} is required`;
          }
        });
      }

      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        // focus the first invalid field for accessibility
        const firstKey = Object.keys(errs)[0];
        const el = inputRefs.current[firstKey];
        if (el && typeof el.focus === 'function') el.focus();
        throw new Error('Please fix the highlighted fields');
      }
      setFieldErrors({});

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        // position may be an object or string; ensure we submit the string name
        position: form.position && typeof form.position === 'object' ? (form.position.name || '') : (form.position || ''),
        experience: form.experience,
        availability: form.availability,
        cover_letter: form.cover_letter,
        resume_url: form.resume_url && form.resume_url.trim() ? form.resume_url.trim() : null
      };

  const res = await fetch(getApiUrl('/jobs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        // If backend returned validation errors array, map to fieldErrors and focus
        if (errBody && Array.isArray(errBody.errors)) {
          const map = {};
          errBody.errors.forEach((it) => {
            if (it.field) map[it.field] = it.error || 'Invalid value';
          });
          setFieldErrors(map);
          const first = Object.keys(map)[0];
          if (first) {
            const el = inputRefs.current[first];
            if (el && typeof el.focus === 'function') el.focus();
          }
          throw new Error('Please fix the highlighted fields');
        }

        throw new Error(errBody.error || 'Submission failed');
      }

  await res.json();
  setMessage(copy.success || 'Application submitted — thank you!');
  // reset to a sensible default: first available position name or empty string
  const defaultPos = positions && positions.length ? (positions[0].name || positions[0] || '') : '';
  setForm({ name: '', email: '', phone: '', position: defaultPos, availability: '', experience: '', cover_letter: '', resume_url: '' });
    } catch (err) {
      setError(copy.failure || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch positions and optional dynamic fields on mount
  useEffect(() => {
    // Fetch public-facing active positions first. If that returns none,
    // fall back to the admin-facing list (older behavior) and finally a static list.
    fetch(getApiUrl('/job-positions/public'))
      .then((r) => r.ok ? r.json() : [])
      .then((publicPositions) => {
        if (Array.isArray(publicPositions) && publicPositions.length) {
          // store array of objects so we can display name and preserve id
          setPositions(publicPositions);
          setForm((s) => ({ ...s, position: publicPositions[0].name }));
          setHasOpenPositions(true);
          return;
        }

        setPositions([]);
        setForm((s) => ({ ...s, position: '' }));
        setHasOpenPositions(false);
      })
      .catch(() => {
      setPositions([]);
      setForm((s) => ({ ...s, position: '' }));
      setHasOpenPositions(false);
      });

    fetch(getApiUrl('/application-fields'))
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length) setFields(data);
      })
      .catch(() => {});

    fetch(getApiUrl('/settings'))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const settings = data?.settings || {};
        setCopy({
          success: settings.jobs_success_copy || '',
          failure: settings.jobs_error_copy || '',
          sidebarHeading: settings.jobs_sidebar_heading || '',
          sidebarIntro: settings.jobs_sidebar_intro || '',
          sidebarBenefits: settings.jobs_sidebar_benefits || '',
          positionsLabel: settings.jobs_positions_label || ''
        });
      })
      .catch(() => setCopy({
        success: '',
        failure: '',
        sidebarHeading: '',
        sidebarIntro: '',
        sidebarBenefits: '',
        positionsLabel: ''
      }));
  }, []);

  const sidebarBenefitsHtml = useMemo(() => sanitizeRichText(copy.sidebarBenefits || ''), [copy.sidebarBenefits]);
  const activePositionDescription = useMemo(() => {
    if (hoveredPosition && hoveredPosition.description) {
      return hoveredPosition.description;
    }
    const selected = positions.find((p) => (p.name || p) === (form.position || ''));
    return selected?.description || '';
  }, [hoveredPosition, positions, form.position]);

  return (
    <section id="jobs" className="px-4 py-8 md:py-12 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div className="bg-background/80 border border-divider rounded-lg shadow px-5 py-6 space-y-5">
            <div>
              <h3 className="text-xl font-semibold text-text-primary">{copy.sidebarHeading || 'Why you’ll love working here'}</h3>
              {copy.sidebarIntro && <p className="text-text-secondary mt-2">{copy.sidebarIntro}</p>}
            </div>
            {sidebarBenefitsHtml && (
              <div className="prose prose-invert prose-sm max-w-none text-text-secondary [&>ul]:list-disc [&>ul]:pl-5" dangerouslySetInnerHTML={{ __html: sidebarBenefitsHtml }} />
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                {copy.positionsLabel || 'Open Positions'}
              </p>
              {positions.length > 0 ? (
                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {positions.map((p) => (
                    <li key={p.id || p.name || p}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg bg-surface-warm/30 hover:bg-primary/15 transition font-medium text-text-primary"
                        onMouseEnter={() => setHoveredPosition(p)}
                        onMouseLeave={() => setHoveredPosition(null)}
                        onFocus={() => setHoveredPosition(p)}
                        onBlur={() => setHoveredPosition(null)}
                      >
                        {p.name || p}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary mt-2">We&apos;re not hiring right now. Check back soon.</p>
              )}
              {activePositionDescription && (
                <div className="mt-3 text-sm text-brand-dark bg-brand/10 border border-brand/30 p-4 rounded-lg shadow-inner transition-colors">
                  {activePositionDescription}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 bg-background p-5 rounded-lg shadow border border-divider">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="text-sm mb-1">Full name *</span>
              <input id="name" ref={el => inputRefs.current.name = el} name="name" value={form.name} onChange={handleChange} required aria-required="true" className="form-input" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'err-name' : undefined} />
              {fieldErrors.name && <div id="err-name" className="text-sm text-red-600 mt-1">{fieldErrors.name}</div>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Email *</span>
              <input id="email" ref={el => inputRefs.current.email = el} name="email" type="email" value={form.email} onChange={handleChange} required aria-required="true" className="form-input" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'err-email' : undefined} />
              {fieldErrors.email && <div id="err-email" className="text-sm text-red-600 mt-1">{fieldErrors.email}</div>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Phone *</span>
              <input id="phone" ref={el => inputRefs.current.phone = el} name="phone" value={form.phone} onChange={handleChange} required aria-required="true" className="form-input" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'err-phone' : undefined} />
              {fieldErrors.phone && <div id="err-phone" className="text-sm text-red-600 mt-1">{fieldErrors.phone}</div>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Position *</span>
              {hasOpenPositions ? (
                <select id="position" ref={el => inputRefs.current.position = el} name="position" value={form.position} onChange={handleChange} required aria-required="true" className="form-input" aria-invalid={!!fieldErrors.position} aria-describedby={fieldErrors.position ? 'err-position' : undefined}>
                  {positions.map((p) => (
                    // positions may be objects ({id, name}) or simple strings
                    <option key={p.id || p} value={p.name || p}>{p.name || p}</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-lg bg-surface-warm text-text-secondary text-sm border border-divider">
                  Not hiring right now. You can still submit an application without selecting a position.
                </div>
              )}
              {fieldErrors.position && <div id="err-position" className="text-sm text-red-600 mt-1">{fieldErrors.position}</div>}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm mb-1">Availability / desired start *</span>
              <input id="availability" name="availability" value={form.availability} onChange={handleChange} required aria-required="true" ref={el => inputRefs.current.availability = el} className="form-input" aria-invalid={!!fieldErrors.availability} aria-describedby={fieldErrors.availability ? 'err-availability' : undefined} />
              {fieldErrors.availability && <div id="err-availability" className="text-sm text-red-600 mt-1">{fieldErrors.availability}</div>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Years of experience *</span>
              <input id="experience" name="experience" value={form.experience} onChange={handleChange} required aria-required="true" ref={el => inputRefs.current.experience = el} className="form-input" aria-invalid={!!fieldErrors.experience} aria-describedby={fieldErrors.experience ? 'err-experience' : undefined} />
              {fieldErrors.experience && <div id="err-experience" className="text-sm text-red-600 mt-1">{fieldErrors.experience}</div>}
            </label>
          </div>

          <label className="flex flex-col">
            <span className="text-sm mb-1">Cover letter (optional)</span>
            <textarea name="cover_letter" value={form.cover_letter} onChange={handleChange} rows="4" className="form-input" />
          </label>

          <label className="flex flex-col">
            <span className="text-sm mb-1">Resume / portfolio link (optional)</span>
            <input
              id="resume_url"
              ref={el => { inputRefs.current.resume_url = el; }}
              name="resume_url"
              value={form.resume_url}
              onChange={handleChange}
              className="form-input"
              placeholder="https://example.com/resume.pdf"
              aria-invalid={!!fieldErrors.resume_url}
              aria-describedby={fieldErrors.resume_url ? 'err-resume-url' : undefined}
            />
            {fieldErrors.resume_url && <div id="err-resume-url" className="text-sm text-red-600 mt-1">{fieldErrors.resume_url}</div>}
          </label>
          {fields && Array.isArray(fields) && (
            <div className="mt-4 bg-surface p-3 rounded">
              <h4 className="font-medium mb-2">Additional information</h4>
              {fields.map(f => (
                <label key={f.id} className="flex flex-col mb-3">
                  <span className="text-sm mb-1">{f.field_name}{f.required ? ' *' : ''}</span>
                  {f.field_type === 'text' && (
                    <input ref={el => inputRefs.current[f.field_name] = el} name={f.field_name} value={form[f.field_name] || ''} onChange={handleChange} className="form-input" aria-invalid={!!fieldErrors[f.field_name]} />
                  )}
                  {f.field_type === 'textarea' && (
                    <textarea ref={el => inputRefs.current[f.field_name] = el} name={f.field_name} value={form[f.field_name] || ''} onChange={handleChange} className="form-input" rows={3} />
                  )}
                  {fieldErrors[f.field_name] && <div className="text-sm text-red-600 mt-1">{fieldErrors[f.field_name]}</div>}
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button type="submit" className="w-full bg-primary text-text-inverse py-2 px-4 rounded-lg hover:bg-primary-dark transition font-bold text-base shadow-sm" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
          </form>
        </div>

        <div className="mt-4 space-y-2">
          {error && <Toast type="error">{error}</Toast>}
          {message && <Toast type="success">{message}</Toast>}
        </div>
      </div>
    </section>
  );
}
