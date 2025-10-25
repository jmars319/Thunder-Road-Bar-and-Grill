/*
  NewsletterModule

  Purpose:
  - Admin management of newsletter subscribers (list, remove, export).

  Contract:
  - Rendered inside admin shell. Expects GET /api/newsletter/subscribers and
    DELETE /api/newsletter/subscribers/:id for removal.

  Notes:
  - For very large lists consider server-side paging or an export endpoint.
*/
import { useState, useEffect } from 'react';
import { icons } from '../../icons';

/*
  NewsletterModule

  Purpose:
  - Admin list management for newsletter subscribers.

  API expectations:
  - GET /api/newsletter/subscribers -> [ { id, email, name, subscribed_at, is_active }, ... ]
  - DELETE /api/newsletter/subscribers/:id

  Notes:
  - For very large lists consider server-side pagination or an export endpoint.
*/

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

function NewsletterModule() {
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = () => {
    fetch(`${API_BASE}/newsletter/subscribers`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => setSubscribers(Array.isArray(data) ? data : []))
      .catch(() => setSubscribers([]));
  };

  const removeSubscriber = (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    // Wrap in try/catch-like promise chain and surface a minimal error so
    // maintainers can add logging or toast feedback later.
    fetch(`${API_BASE}/newsletter/subscribers/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Delete failed');
        return res.json();
      })
  .then(() => fetchSubscribers())
      .catch((_err) => {
        // Intentionally quiet in UI, but log to console for debugging in dev.
        // Replace with toast/notification in future iterations.
        console.error('Failed to remove subscriber', _err);
      });
  };

  const exportSubscribers = () => {
    try {
      // Simple CSV escaping: remove commas from fields to avoid breaking CSV
      // structure. For a robust solution use a CSV library that handles
      // quoting and newlines.
      const csv = [
        ['Email', 'Name', 'Subscribed Date', 'Status'].join(','),
        ...subscribers.map(sub => [
          (sub.email || '').replace(/,/g, ''),
          (sub.name || '').replace(/,/g, ''),
          sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : '',
          sub.is_active ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter-subscribers.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      console.error('Failed to export subscribers', _err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Newsletter Subscribers</h3>
          <p className="text-sm text-text-secondary">
            {Array.isArray(subscribers) ? subscribers.filter(s => s.is_active).length : 0} active subscribers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportSubscribers}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
          >
            <icons.Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Subscribed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.isArray(subscribers) && subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-surface-warm">
                  <td className="px-6 py-4 text-sm text-text-primary">{sub.email}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{sub.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sub.is_active 
                        ? 'bg-success text-text-inverse' 
                        : 'bg-surface text-text-primary'
                    }`}>
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => removeSubscriber(sub.id)}
                      className="text-error hover:bg-surface-warm p-2 rounded"
                      title="Remove subscriber"
                    >
                      <icons.Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {(!Array.isArray(subscribers) || subscribers.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-3 text-sm text-text-secondary text-center">No subscribers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Module = {
  component: NewsletterModule,
  name: 'Newsletter',
  icon: icons.Mail
};

export default Module;
