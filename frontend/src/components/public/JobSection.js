/*
  JobSection

  Purpose:
  - Public job application UI. Fetches open positions and optional dynamic
    application fields, allows applicants to submit a form and upload a resume.

  Contract:
  - Submits POST /api/jobs. Uploads resume via POST /api/media/upload when present.

  Notes:
  - Performs client-side validation and uses XHR for upload progress feedback.
    Keep MAX_FILE_BYTES and ALLOWED_TYPES in sync with server-side limits.
*/

import { useState, useRef, useEffect } from 'react';
import Toast from '../ui/Toast';
// Shared upload configuration (synced at build time)
import uploadConfig from '../../config/uploadConfig.json';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';
void Toast;

// Public-facing job application form (frontend-only integration)
// Submits to POST /api/jobs and uploads resume via /api/media/upload when present
export default function JobSection() {
  const [positions, setPositions] = useState([]);
  const [fields, setFields] = useState(null); // optional dynamic application fields from admin

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    availability: '',
    experience: '',
    cover_letter: ''
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const inputRefs = useRef({});
  const uploadXhrRef = useRef(null);
  const [previewWarning, setPreviewWarning] = useState(null);

  // Validation rules (imported from shared config)
  const MAX_FILE_BYTES = (uploadConfig && uploadConfig.resume && uploadConfig.resume.maxBytes) || 3 * 1024 * 1024; // 3 MB
  const ALLOWED_TYPES = (uploadConfig && uploadConfig.resume && uploadConfig.resume.types) || ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    // Pre-upload validation: size + type
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        setFieldErrors((errs) => ({ ...errs, resume: 'Resume must be 3 MB or smaller' }));
        setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (ALLOWED_TYPES.indexOf(file.type) === -1) {
        setFieldErrors((errs) => ({ ...errs, resume: 'Resume must be PDF or Word document' }));
        setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // valid
    setFieldErrors((errs) => {
      const next = { ...errs };
      delete next.resume;
      return next;
    });
    setResumeFile(file);
    // non-blocking preview warning for large (but acceptable) files (>800 KB)
    if (file && file.size > 800 * 1024 && file.size <= MAX_FILE_BYTES) {
      setPreviewWarning('Large file: upload may take longer. Consider optimizing your resume PDF.');
    } else {
      setPreviewWarning(null);
    }
  }

  // Upload using XMLHttpRequest to provide progress feedback
  function uploadResume(file) {
    if (!file) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const xhr = new window.XMLHttpRequest();
      // keep reference so upload can be cancelled
      uploadXhrRef.current = xhr;
      const fd = new FormData();
  fd.append('file', file);
  // Inform the server this is a resume so server-side rules are applied
  fd.append('category', 'resume');

  // Use a query param so the backend can pick up category before multer runs
  xhr.open('POST', `${API_BASE}/media/upload?category=resume`);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      };

      xhr.onload = function () {
        setUploadProgress(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            uploadXhrRef.current = null;
            resolve(data.file_url || null);
          } catch (err) {
            uploadXhrRef.current = null;
            reject(new Error('Invalid upload response'));
          }
        } else {
          uploadXhrRef.current = null;
          reject(new Error('Resume upload failed'));
        }
      };

      xhr.onerror = function () {
        uploadXhrRef.current = null;
        reject(new Error('Network error during upload'));
      };
      xhr.send(fd);
    });
  }

  function cancelUpload() {
    if (uploadXhrRef.current) {
      try { uploadXhrRef.current.abort(); } catch (e) {}
      uploadXhrRef.current = null;
      setUploadProgress(0);
      setError('Upload cancelled');
    }
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

      if (resumeFile) {
        if (resumeFile.size > MAX_FILE_BYTES) errs.resume = 'Resume must be 3 MB or smaller';
        if (ALLOWED_TYPES.indexOf(resumeFile.type) === -1) errs.resume = 'Resume must be PDF or Word document';
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

      let resume_url = null;
      if (resumeFile) {
        resume_url = await uploadResume(resumeFile);
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        // position may be an object or string; ensure we submit the string name
        position: form.position && typeof form.position === 'object' ? (form.position.name || '') : (form.position || ''),
        experience: form.experience,
        cover_letter: form.cover_letter,
        resume_url
      };

  const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  setMessage('Application submitted — thank you!');
  // reset to a sensible default: first available position name or empty string
  const defaultPos = positions && positions.length ? (positions[0].name || positions[0] || '') : '';
  setForm({ name: '', email: '', phone: '', position: defaultPos, availability: '', experience: '', cover_letter: '' });
      setResumeFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch positions and optional dynamic fields on mount
  useEffect(() => {
    // Fetch public-facing active positions first. If that returns none,
    // fall back to the admin-facing list (older behavior) and finally a static list.
    fetch(`${API_BASE}/job-positions/public`)
      .then((r) => r.ok ? r.json() : [])
      .then((publicPositions) => {
        if (Array.isArray(publicPositions) && publicPositions.length) {
          // store array of objects so we can display name and preserve id
          setPositions(publicPositions);
          setForm((s) => ({ ...s, position: publicPositions[0].name }));
          return;
        }

        // No public/open positions — use a static fallback list instead of
        // calling admin endpoints which are intentionally protected. This
        // avoids noisy 401 Unauthorized errors in the browser console.
        const fallback = ['Server','Bartender','Line Cook','Prep Cook','Dishwasher','Host','Manager'];
        setPositions(fallback.map((p, i) => ({ id: `f-${i}`, name: p })));
        setForm((s) => ({ ...s, position: fallback[0] }));
      })
      .catch(() => {
        const fallback = ['Server','Bartender','Line Cook','Prep Cook','Dishwasher','Host','Manager'];
        setPositions(fallback.map((p, i) => ({ id: `f-${i}`, name: p })));
        setForm((s) => ({ ...s, position: fallback[0] }));
      });

    fetch(`${API_BASE}/application-fields`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length) setFields(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="jobs" className="px-4 py-8 md:py-12 bg-surface">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-3">Join our team</h2>
        <p className="mb-4 text-muted">We're hiring friendly, reliable people. Fill out the short form below to apply.</p>

        <form onSubmit={handleSubmit} className="space-y-3 bg-background p-4 rounded shadow-sm">
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
              {positions && positions.length > 0 ? (
                <select id="position" ref={el => inputRefs.current.position = el} name="position" value={form.position} onChange={handleChange} required aria-required="true" className="form-input" aria-invalid={!!fieldErrors.position} aria-describedby={fieldErrors.position ? 'err-position' : undefined}>
                  {positions.map((p) => (
                    // positions may be objects ({id, name}) or simple strings
                    <option key={p.id || p} value={p.name || p}>{p.name || p}</option>
                  ))}
                </select>
              ) : (
                // If no positions are available, allow the applicant to type a position.
                <input id="position" ref={el => inputRefs.current.position = el} name="position" value={form.position} onChange={handleChange} required aria-required="true" className="form-input" placeholder="Position (e.g. Server)" />
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
            <span className="text-sm mb-1">Resume (optional)</span>
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="application/pdf,.doc,.docx" onChange={handleFileChange} aria-describedby="resume-help" />
              <div className="text-sm text-muted" id="resume-help">PDF or Word — max 3 MB</div>
            </div>
            {resumeFile && (
                <div className="mt-2 text-sm">
                  Selected: {resumeFile.name} · {(resumeFile.size / 1024).toFixed(0)} KB
                </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-surface-warm h-2 rounded mt-2 overflow-hidden">
                <div className="bg-accent h-2" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <button type="button" onClick={cancelUpload} className="btn btn-ghost btn-sm">Cancel upload</button>
              </div>
            )}
            {previewWarning && <Toast type="info">{previewWarning}</Toast>}
          </label>
          {error && <Toast type="error">{error}</Toast>}
          {message && <Toast type="success">{message}</Toast>}

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
    </section>
  );
}
