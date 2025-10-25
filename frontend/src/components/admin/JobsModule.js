/*
  JobsModule

  Purpose:
  - Admin panel for reviewing job applications and managing job postings.

  Contract:
  - Rendered inside the admin shell. Expects job-related API endpoints for
    listing and updating applications.

  Notes:
  - Keep applicant data handling minimal and avoid leaking PII in logs.
*/
import { useState, useEffect } from 'react';
import { icons } from '../../icons';

/*
  JobsModule

  Purpose:
  - Admin interface for reviewing job applications. Allows status updates and deletion.

  API expectations:
  - GET    /api/jobs -> [ { id, name, email, position, submitted_at, status, ... }, ... ]
  - PUT    /api/jobs/:id { status }
  - DELETE /api/jobs/:id

  Developer notes:
  - Status-to-color mapping is defined in getStatusColor. If new statuses are added
    server-side, update the mapping here for consistent UI.
  - The component performs best-effort network calls and refetches after updates.
    For an improved UX consider optimistic updates or per-item loading states.
  Accessibility:
  - Interactive list items are rendered as buttons; ensure they have type="button"
    to avoid accidental form submissions. The applications list uses role="list"
    and each item uses role="listitem" for better screen reader semantics.
*/
  // Last updated: 2025-10-21 — doc sweep: noted optimistic updates and accessibility reminders.

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

function JobsModule() {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [positions, setPositions] = useState([]);
  const [newPositionName, setNewPositionName] = useState('');

  useEffect(() => {
    fetchApplications();
    fetchPositions();
  }, []);

  const fetchApplications = () => {
    fetch(`${API_BASE}/jobs`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch applications');
        return res.json();
      })
      .then(data => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]));
  };

  const fetchPositions = () => {
    fetch(`${API_BASE}/job-positions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]));
  };

  const createPosition = () => {
    if (!newPositionName.trim()) return;
    fetch(`${API_BASE}/job-positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPositionName })
    }).then(res => {
      if (res.ok) {
        setNewPositionName('');
        fetchPositions();
      }
    }).catch(() => {});
  };

  const deletePosition = (id) => {
    if (!window.confirm('Delete this position?')) return;
    fetch(`${API_BASE}/job-positions/${id}`, { method: 'DELETE' })
      .then(() => fetchPositions())
      .catch(() => {});
  };

  const updateStatus = (id, status) => {
    fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(res => {
      if (res.ok) fetchApplications();
      else fetchApplications();
    }).catch(() => fetchApplications());
  };

  const deleteApplication = (id) => {
    if (window.confirm('Delete this application?')) {
      fetch(`${API_BASE}/jobs/${id}`, { method: 'DELETE' })
        .then(() => {
          fetchApplications();
          setSelectedApp(null);
        }).catch(() => {});
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
  case 'new': return 'bg-surface text-text-inverse';
  case 'reviewing': return 'bg-warning text-text-inverse';
      case 'interviewed': return 'bg-accent text-text-inverse';
      case 'hired': return 'bg-success text-text-inverse';
      case 'rejected': return 'bg-error text-text-inverse';
  default: return 'bg-surface text-text-inverse';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg text-text-primary">Applications</h3>
        </div>
        <div className="p-4 border-b">
          <label className="block text-sm font-medium text-text-primary mb-2">Manage Positions</label>
          <div className="flex gap-2">
            <input className="form-input flex-1" value={newPositionName} onChange={(e) => setNewPositionName(e.target.value)} placeholder="New position name" />
            <button type="button" onClick={createPosition} className="btn">Add</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {positions.map(p => (
              <div key={p.id} className="px-2 py-1 bg-surface-warm rounded flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!p.is_active}
                    onChange={(e) => {
                      // optimistic update
                      const next = positions.map(x => x.id === p.id ? { ...x, is_active: e.target.checked } : x);
                      setPositions(next);
                      fetch(`${API_BASE}/job-positions/${p.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_active: e.target.checked })
                      }).then(res => {
                        if (!res.ok) {
                          // revert on error
                          fetchPositions();
                        }
                      }).catch(() => fetchPositions());
                    }}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
                <button type="button" onClick={() => deletePosition(p.id)} className="text-error" aria-label={`Delete position ${p.name}`}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y max-h-[420px] overflow-y-auto" role="list" aria-label="Job applications list">
          {applications.map(app => (
            <button
              key={app.id}
              type="button"
              role="listitem"
              aria-label={`View application from ${app.name}`}
              aria-current={selectedApp?.id === app.id ? 'true' : undefined}
              onClick={() => setSelectedApp(app)}
              className={`w-full p-4 text-left hover:bg-surface-warm transition ${
                selectedApp?.id === app.id ? 'bg-surface-warm' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{app.name}</p>
                  <p className="text-sm text-text-secondary">{app.position}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : ''}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`} aria-hidden>
                  {app.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow">
        {selectedApp ? (
            <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{selectedApp.name}</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Position: {selectedApp.position}
                </p>
                <p className="text-sm text-text-secondary">Email: {selectedApp.email}</p>
                {selectedApp.phone && <p className="text-sm text-text-secondary">Phone: {selectedApp.phone}</p>}
                <p className="text-xs text-text-secondary mt-2">
                  {selectedApp.submitted_at ? new Date(selectedApp.submitted_at).toLocaleString() : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteApplication(selectedApp.id)}
                className="text-error p-2 rounded hover:bg-surface-warm"
                aria-label={`Delete application from ${selectedApp.name}`}
              >
                <icons.Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Status</label>
                <select
                  value={selectedApp.status}
                  onChange={(e) => updateStatus(selectedApp.id, e.target.value)}
                  className="w-full form-input"
                >
                  <option value="new">New</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {selectedApp.experience && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Experience</label>
                  <p className="text-text-primary whitespace-pre-wrap p-3 bg-surface-warm rounded-lg">
                    {selectedApp.experience}
                  </p>
                </div>
              )}

              {selectedApp.cover_letter && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Cover Letter</label>
                  <p className="text-text-primary whitespace-pre-wrap p-3 bg-surface-warm rounded-lg">
                    {selectedApp.cover_letter}
                  </p>
                </div>
              )}

              {selectedApp.resume_url && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Resume</label>
                  <a
                      href={selectedApp.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-primary hover:underline"
                    >
                      View Resume
                    </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-12 text-center text-text-inverse">
            <div>
              <icons.Briefcase size={48} className="mx-auto mb-4" />
              <p>Select an application to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Module = {
  component: JobsModule,
  name: 'Jobs',
  icon: icons.Briefcase
};

export default Module;
