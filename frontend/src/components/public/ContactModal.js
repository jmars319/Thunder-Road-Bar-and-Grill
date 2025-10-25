import { useState } from 'react';
import Spinner from '../ui/Spinner';
// reference Spinner to satisfy some analyzers that don't detect JSX usage in ternaries
void Spinner;

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!form.name || !form.name.trim()) return 'Name is required';
    if (!form.email || !form.email.trim()) return 'Email is required';
    // simple email check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return 'Enter a valid email address';
    if (!form.message || !form.message.trim()) return 'Message is required';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to send message');
      }
      setSuccess(true);
      try { if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Message sent — thank you!' })); } catch (e) {}
      // notify admin UI listeners that a new contact arrived
      try { if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') window.dispatchEvent(new window.CustomEvent('contactMessageSent', { detail: { submitted_at: new Date().toISOString() } })); } catch (e) {}
      setTimeout(() => { setLoading(false); onClose(); }, 900);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to send message');
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-4 max-w-md w-full">
        <h3 className="text-lg font-bold mb-2 text-text-primary">Contact Us</h3>
        <p className="text-sm text-text-secondary mb-3">Send us a message and we'll get back to you as soon as we can.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-text-primary mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full form-input" />
          </div>
          <div>
            <label className="block text-sm text-text-primary mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full form-input" />
          </div>
          <div>
            <label className="block text-sm text-text-primary mb-1">Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full form-input" />
          </div>
          <div>
            <label className="block text-sm text-text-primary mb-1">Subject (optional)</label>
            <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full form-input" />
          </div>
          <div>
            <label className="block text-sm text-text-primary mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows="5" className="w-full form-input" />
          </div>

          {error && <div className="text-sm text-error">{error}</div>}

          <div className="flex gap-2 mt-2">
            <button type="submit" className="flex-1 bg-primary text-text-inverse py-1 rounded" disabled={loading}>
              {loading ? <><Spinner size={16} /> Sending…</> : 'Send Message'}
            </button>
            <button type="button" onClick={() => onClose()} className="flex-1 bg-surface-warm text-text-secondary py-1 rounded">Cancel</button>
          </div>

          {success && <div className="text-sm text-success">Message sent — thank you!</div>}
        </form>
      </div>
    </div>
  );
}
