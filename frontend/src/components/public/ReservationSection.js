import React, { useEffect, useState } from 'react';
import { icons } from '../../icons';
import { getApiUrl } from '../../config/api';

/*
  ReservationSection

  Purpose:
  - Provide a simple reservation form that posts to the backend API.

  Accessibility:
  - Labels are associated with inputs using explicit ids. Required fields are
    marked with aria-required to aid assistive tech. This component performs
    minimal validation; enhance as needed upstream.
*/

/* DEV:
   - Feedback messages and input panels use semantic tokens (bg-success/10,
     text-success, bg-error/10, bg-surface-warm, border-border, etc.). Change
     colors in `frontend/src/custom-styles.css` to affect runtime theming
     globally instead of editing utilities in this component.
   - Removed a file-level eslint suppression so imports and usage are handled
     by the standard lint rules.
   
   Last reviewed: 2025-10-24 — accessibility and token guidance confirmed; no per-file suppressions remain.
*/

export default function ReservationSection() {

  // NOTE: UI feedback uses tokenized classes (e.g., bg-success/10, text-success,
  // bg-error/10). When adjusting colors, update tokens in `custom-styles.css`
  // rather than inline utilities to preserve runtime theming.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reservation_date: '',
    reservation_time: '',
    number_of_guests: 2,
    special_requests: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [copy, setCopy] = useState({ heading: '', intro: '', success: '', failure: '' });

  useEffect(() => {
    fetch(getApiUrl('/settings'))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const settings = data?.settings || {};
        setCopy({
          heading: settings.reservations_heading || '',
          intro: settings.reservations_intro || '',
          success: settings.reservations_success_copy || '',
          failure: settings.reservations_error_copy || ''
        });
      })
      .catch(() => {
        setCopy({ heading: '', intro: '', success: '', failure: '' });
      });
  }, []);

  const handleSubmit = async () => {
    setError('');
    setErrors({});

    // Client-side presence validation to provide immediate feedback
    const localErrors = {};
    if (!formData.name) localErrors.name = 'Name is required';
    if (!formData.phone) localErrors.phone = 'Phone is required';
    if (!formData.reservation_date) localErrors.reservation_date = 'Reservation date is required';
    if (!formData.reservation_time) localErrors.reservation_time = 'Reservation time is required';
    if (!formData.number_of_guests || Number(formData.number_of_guests) <= 0) localErrors.number_of_guests = 'Number of guests must be at least 1';

    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      setError('Please fix the highlighted fields');
      return;
    }
    try {
      // Ensure number_of_guests is a number before sending
      const payload = { ...formData, number_of_guests: Number(formData.number_of_guests) || 1 };

      const response = await fetch(getApiUrl('/reservations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
        setFormData({
          name: '',
          email: '',
          phone: '',
          reservation_date: '',
          reservation_time: '',
          number_of_guests: 2,
          special_requests: ''
        });
        setErrors({});
      } else {
        // Attempt to surface validation errors (backend returns { errors: [{field,error}, ...] })
        let payload;
        try {
          payload = await response.json();
        } catch (e) {
          setError('Failed to submit reservation');
          return;
        }

        if (payload && Array.isArray(payload.errors)) {
          const map = {};
          payload.errors.forEach((it) => {
            if (it.field) map[it.field] = it.error || 'Invalid value';
          });
          setErrors(map);
          setError('Please fix the highlighted fields');

          // focus first invalid field if present in DOM
          const firstField = Object.keys(map)[0];
          if (firstField) {
            const el = document.getElementById(`res-${firstField}`);
            if (el && typeof el.focus === 'function') el.focus();
          }
        } else if (payload && payload.error) {
          setError(payload.error);
        } else {
          setError('Failed to submit reservation');
        }
      }
    } catch {
      setError('An error occurred');
    }
  };

  return (
    <div id="reservations" className="py-10 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reservation-copy-block">
          {copy.heading && <h2 className="text-2xl font-heading font-bold text-center mb-2">{copy.heading}</h2>}
          {copy.intro && <p className="text-center text-text-secondary mb-0">{copy.intro}</p>}
        </div>

        <div className="reservation-alert-slot" aria-live="polite">
          {submitted && (
            <div className="w-full bg-success/10 border border-success rounded-lg p-3 flex items-center gap-3">
              {React.createElement(icons.CheckCircle, { size: 20, className: 'text-success' })}
              <p className="text-success m-0">{copy.success || "Reservation submitted! We'll contact you to confirm."}</p>
            </div>
          )}

          {!submitted && error && (
            <div className="w-full bg-error/10 border border-error rounded-lg p-3 flex items-center gap-3">
              {React.createElement(icons.AlertCircle, { size: 20, className: 'text-error' })}
              <p className="text-error m-0">{copy.failure || error}</p>
            </div>
          )}
        </div>

        <div className="bg-surface-warm rounded-lg shadow-lg p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="res-name" className="block text-sm font-medium text-text-primary mb-2">Name *</label>
              <input
                id="res-name"
                type="text"
                aria-required="true"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="form-input w-full px-3 py-2 border border-border rounded-lg focus:outline-none transition"
              />
                  {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="res-phone" className="block text-sm font-medium text-text-primary mb-2">Phone *</label>
              <input
                id="res-phone"
                type="tel"
                aria-required="true"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="form-input w-full px-3 py-2 border border-border rounded-lg focus:outline-none transition"
              />
                  {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="res-email" className="block text-sm font-medium text-text-primary mb-2">Email</label>
            <input
              id="res-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="form-input w-full px-4 py-2 border border-border rounded-lg focus:outline-none transition"
            />
              {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-date" className="block text-sm font-medium text-text-primary mb-2">Date *</label>
              <input
                id="res-date"
                type="date"
                aria-required="true"
                value={formData.reservation_date}
                onChange={(e) => setFormData({...formData, reservation_date: e.target.value})}
                className="form-input w-full px-4 py-2 border border-border rounded-lg focus:outline-none transition"
              />
              {errors.reservation_date && <p className="text-xs text-error mt-1">{errors.reservation_date}</p>}
            </div>
            <div>
              <label htmlFor="res-time" className="block text-sm font-medium text-text-primary mb-2">Time *</label>
              <input
                id="res-time"
                type="time"
                aria-required="true"
                value={formData.reservation_time}
                onChange={(e) => setFormData({...formData, reservation_time: e.target.value})}
                className="form-input w-full px-4 py-2 border border-border rounded-lg focus:outline-none transition"
              />
              {errors.reservation_time && <p className="text-xs text-error mt-1">{errors.reservation_time}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="res-guests" className="block text-sm font-medium text-text-primary mb-2">Number of Guests *</label>
            <input
              id="res-guests"
              type="number"
              min="1"
              aria-required="true"
              value={formData.number_of_guests}
              onChange={(e) => setFormData({...formData, number_of_guests: parseInt(e.target.value) || 1})}
              className="form-input w-full px-4 py-2 border border-border rounded-lg focus:outline-none transition"
            />
              {errors.number_of_guests && <p className="text-xs text-error mt-1">{errors.number_of_guests}</p>}
          </div>

          <div>
            <label htmlFor="res-requests" className="block text-sm font-medium text-text-primary mb-2">Special Requests</label>
            <textarea
              id="res-requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
              rows="3"
              className="form-input w-full px-4 py-2 border border-border rounded-lg focus:outline-none transition"
              placeholder="Allergies, celebrations, accessibility needs, etc."
            ></textarea>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-text-inverse py-2 px-4 rounded-lg hover:bg-primary-dark transition font-bold text-base shadow-sm"
          >
            Submit Reservation
          </button>
        </div>
  {/* icons are used via the `icons` map above; no module-scope no-op required */}
      </div>
    </div>
  );
}

// Member-expression JSX like <icons.CheckCircle /> should be detected by
// modern tooling; keeping the code minimal here.
