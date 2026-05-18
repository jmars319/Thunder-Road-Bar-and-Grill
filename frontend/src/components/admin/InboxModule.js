import { useEffect, useState, useCallback } from 'react';
import { icons } from '../../icons';
import { authenticatedFetch } from '../../utils/api';
import ConfirmDialog from '../ui/ConfirmDialog';

function InboxModule() {
  const [messages, setMessages] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('new');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const closeConfirmDialog = useCallback(() => setConfirmDialog(null), []);
  const runConfirmDialogAction = useCallback(async () => {
    const action = confirmDialog?.onConfirm;
    setConfirmDialog(null);
    if (typeof action === 'function') {
      await action();
    }
  }, [confirmDialog]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      status: statusFilter,
      sort_by: sortBy,
      sort_dir: sortDir
    });
    try {
      const res = await authenticatedFetch(`/contact/messages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.data) ? data.data : (Array.isArray(data.messages) ? data.messages : []));
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } else {
        setMessages([]);
        setTotal(0);
      }
    } catch {
      setMessages([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const updateMessage = async (message, updates) => {
    await authenticatedFetch(`/contact/messages/${message.id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    fetchMessages();
  };

  const deleteMessage = (message) => {
    setConfirmDialog({
      title: 'Delete message?',
      message: 'Delete this message?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await authenticatedFetch(`/contact/messages/${message.id}`, { method: 'DELETE' });
        if (modalMessage?.id === message.id) setModalMessage(null);
        fetchMessages();
      }
    });
  };

  const changeSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortDir('ASC');
    }
  };

  const openModal = (message) => {
    setModalMessage(message);
    if (!message.is_read) {
      updateMessage(message, { is_read: 1 });
    }
  };

  const statusOptions = ['new', 'in_progress', 'responded', 'archived'];
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-divider gap-3 text-xs">
          <div className="flex gap-2 flex-wrap">
            {statusOptions.concat('all').map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1 rounded-full ${statusFilter === status ? 'bg-primary text-text-inverse' : 'bg-surface-warm text-text-primary'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="text-text-secondary">Total {total}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <SortableTh label="Name" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Subject" sortKey="subject" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Submitted" sortKey="submitted_at" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">Loading messages…</td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">No messages.</td>
                </tr>
              ) : (
                messages.map(msg => (
                  <tr key={msg.id} className="hover:bg-surface-warm/60">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium text-text-primary" onClick={() => openModal(msg)}>
                        {msg.name}
                      </button>
                      <div className="text-xs text-text-secondary">{msg.email}</div>
                    </td>
                    <td className="px-4 py-3">{msg.subject}</td>
                    <td className="px-4 py-3">{msg.submitted_at ? new Date(msg.submitted_at).toLocaleString() : ''}</td>
                    <td className="px-4 py-3">{msg.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openModal(msg)} className="px-2 py-1 rounded-full text-xs border border-divider text-text-primary">
                          View
                        </button>
                        <select
                          className="form-input text-xs"
                          value={msg.status}
                          onChange={(e) => updateMessage(msg, { status: e.target.value })}
                        >
                          {statusOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => deleteMessage(msg)} className="px-2 py-1 rounded-full text-xs bg-error text-text-inverse flex items-center gap-1">
                          <icons.Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-divider text-xs text-text-secondary">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 rounded-full border border-divider disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <button type="button" className="px-3 py-1 rounded-full border border-divider disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </div>

      {modalMessage && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{modalMessage.subject || 'No subject'}</h3>
                <p className="text-sm text-text-secondary">{modalMessage.name} · {modalMessage.email}</p>
                {modalMessage.phone && <p className="text-xs text-text-secondary">{modalMessage.phone}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => deleteMessage(modalMessage)} className="text-error flex items-center gap-1">
                  <icons.Trash2 size={16} /> Delete
                </button>
                <button type="button" onClick={() => setModalMessage(null)} className="text-text-secondary hover:text-text-primary">
                  <icons.X size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-primary mb-4">
              <Detail label="Submitted" value={modalMessage.submitted_at ? new Date(modalMessage.submitted_at).toLocaleString() : '—'} />
              <Detail label="Status" value={modalMessage.status} />
              <Detail label="Source" value={modalMessage.source || 'Website'} />
              <Detail label="IP Address" value={modalMessage.ip_address || 'Not recorded'} />
            </div>
            <div className="text-sm text-text-primary">
              <p className="text-2xs uppercase tracking-wide text-text-secondary mb-1">Message</p>
              <p className="whitespace-pre-line bg-surface-warm rounded-lg p-4 border border-divider">{modalMessage.message || 'No message provided.'}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <select
                className="form-input text-xs"
                value={modalMessage.status}
                onChange={(e) => {
                  const next = e.target.value;
                  updateMessage(modalMessage, { status: next });
                  setModalMessage(prev => prev ? { ...prev, status: next } : prev);
                }}
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = modalMessage.is_read ? 0 : 1;
                  updateMessage(modalMessage, { is_read: next });
                  setModalMessage(prev => prev ? { ...prev, is_read: next } : prev);
                }}
                className="px-3 py-1 rounded-full border border-divider text-xs"
              >
                {modalMessage.is_read ? 'Mark unread' : 'Mark read'}
              </button>
              <button type="button" onClick={() => setModalMessage(null)} className="px-3 py-1 rounded-full text-xs bg-surface text-text-primary border border-divider">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={runConfirmDialogAction}
          onCancel={closeConfirmDialog}
        />
      )}
    </div>
  );
}

function SortableTh({ label, sortKey, sortBy, sortDir, onSort }) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === sortKey ? (sortDir === 'ASC' ? '▲' : '▼') : null}
      </span>
    </th>
  );
}

const Module = {
  component: InboxModule,
  name: 'Messages',
  icon: icons.Inbox
};

export default Module;

function Detail({ label, value }) {
  return (
    <div className="border border-divider rounded-lg p-3">
      <p className="text-2xs uppercase tracking-wide text-text-secondary mb-1">{label}</p>
      <p className="text-sm text-text-primary">{value || '—'}</p>
    </div>
  );
}
