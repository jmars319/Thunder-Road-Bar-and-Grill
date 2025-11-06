/*
  InboxModule

  Purpose:
  - Admin inbox for viewing and managing contact messages. Supports marking
    messages as read and deleting messages.

  Contract:
  - Rendered in admin shell. Expects GET/PUT/DELETE endpoints for contact messages.

  Notes:
  - Keep UI optimistic but refetch after mutations to ensure server canonical state.
*/
import { useState, useEffect, useCallback } from 'react';
import { sanitize } from 'isomorphic-dompurify';
import { icons } from '../../icons';
import { API_BASE } from '../../config/api';

/*
  InboxModule

  Purpose:
  - Simple admin inbox for viewing contact messages. Supports marking messages as read
    and deleting messages.

  API expectations:
  - GET  /api/contact/messages
      -> [ { id, name, email, subject, message, submitted_at, is_read, phone? }, ... ]
  - PUT  /api/contact/messages/:id  { is_read: true }
  - DELETE /api/contact/messages/:id

  Component contract / usage notes:
  - This is a presentational/admin utility component. The admin routing/authorization
    lives elsewhere and this component assumes it's only rendered for authorized users.
  - All network calls are best-effort. Failures will be quietly caught and the UI
    will render empty/default values. For production consider surface errors via a
    toast or banner so the admin knows an operation failed.

  Edge cases handled here:
  - Protects against non-array GET responses (falls back to an empty list).
  - Marks a message as read only when opening an unread message.
  - Defensive date rendering when submitted_at is missing or invalid.
  Accessibility:
  - Message list renders as interactive buttons; these include type="button" to
    avoid accidental submits. Buttons expose aria-labels and use visual focus
    styles from the project's design tokens.
*/

/* DEV:
   - This admin inbox uses tokenized classes for surfaces and text (e.g., bg-surface,
     bg-surface-warm, text-text-primary, text-text-secondary). Update colors in
     `frontend/src/custom-styles.css` to affect the admin UI globally rather than
     modifying utility classes locally.
   
   Security note:
   - User messages are rendered as plain text (not HTML) to prevent XSS attacks.
     React automatically escapes text content in JSX, so no manual escaping needed.
*/

function InboxModule() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 25; // static for now; change to state if you want a per-page selector
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fetchMessages = useCallback(() => {
    // Prefer a minimal check for OK responses and gracefully handle unexpected shapes
    fetch(`${API_BASE}/contact/messages?page=${page}&per_page=${perPage}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      })
      .then(data => {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      })
      .catch(() => { setMessages([]); setTotal(0); });
  }, [page, perPage]);

  useEffect(() => {
    // initial fetch and refetch when page/perPage change (fetchMessages is stable via useCallback)
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const handler = () => fetchMessages();
    window.addEventListener('contactMessageSent', handler);
    return () => window.removeEventListener('contactMessageSent', handler);
  }, [fetchMessages]);

  

  const markAsRead = (id) => {
    // Only send the update; if it fails keep the UI consistent by refetching.
    fetch(`${API_BASE}/contact/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true })
    }).then(res => {
      if (res.ok) fetchMessages();
      else fetchMessages();
    }).catch(() => fetchMessages());
  };

  const deleteMessage = (id) => {
    if (window.confirm('Delete this message?')) {
      fetch(`${API_BASE}/contact/messages/${id}`, { method: 'DELETE' })
        .then(() => {
          fetchMessages();
          setSelectedMessage(null);
        }).catch(() => {});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-surface rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg text-text-primary">Messages</h3>
        </div>
        <div className="p-3 flex items-center justify-between border-t">
          <div className="text-sm text-text-secondary">{total} messages</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 rounded bg-surface">Prev</button>
            <div className="text-sm">Page {page}</div>
            <button type="button" onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-surface">Next</button>
          </div>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto" role="list" aria-label="Inbox messages">
          {(Array.isArray(messages) ? messages : []).map(msg => (
            <button
              key={msg.id}
              type="button"
              role="listitem"
              aria-label={`Open message from ${msg.name}`}
              aria-current={selectedMessage?.id === msg.id ? 'true' : undefined}
              onClick={() => {
                setSelectedMessage(msg);
                // Mark as read on open only if currently unread
                if (!msg.is_read) markAsRead(msg.id);
              }}
              className={`w-full p-4 text-left hover:bg-surface-warm transition ${
                selectedMessage?.id === msg.id ? 'bg-surface-warm' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {msg.is_read ? <icons.MailOpen size={18} /> : <icons.Mail size={18} className="text-primary" />}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${!msg.is_read ? 'text-text-primary' : ''}`}>
                    {msg.name}
                  </p>
                  <p className="text-sm text-text-secondary truncate">{msg.subject}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {msg.submitted_at ? new Date(msg.submitted_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-surface rounded-lg shadow">
        {selectedMessage ? (
            <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{selectedMessage.subject}</h3>
                <p className="text-sm text-text-secondary mt-1">
                  From: {selectedMessage.name} ({selectedMessage.email})
                </p>
                {selectedMessage.phone && (
                  <p className="text-sm text-text-secondary">Phone: {selectedMessage.phone}</p>
                )}
                <p className="text-xs text-text-secondary mt-2">
                  {selectedMessage.submitted_at ? new Date(selectedMessage.submitted_at).toLocaleString() : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMessage(selectedMessage.id)}
                aria-label="Delete message"
                className="text-error hover:text-error-muted p-2 rounded hover:bg-error/10"
              >
                <icons.Trash2 size={18} />
              </button>
            </div>
              <div className="border-t pt-4">
              <p className="text-text-primary whitespace-pre-wrap">
                {selectedMessage.message}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-12 text-center text-text-secondary">
            <div>
              <icons.Inbox size={48} className="mx-auto mb-4" />
              <p>Select a message to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Module = {
  component: InboxModule,
  name: 'Inbox',
  icon: icons.Inbox
};

export default Module;
