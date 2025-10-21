import { useState, useEffect } from 'react';
import { icons } from '../../icons';

/*
  DashboardModule

  Purpose:
  - Small administrative overview that aggregates counts from several API
    endpoints (reservations, jobs, subscribers, messages) and displays them.

  Developer notes:
  - This component fetches multiple endpoints in parallel using Promise.all.
    Each fetch has a .catch that returns an empty array so the dashboard remains
    usable even if one endpoint fails. Consider adding per-card loading states
    for better perceived performance.
  - The mapping of statuses (e.g., reservation.status === 'pending') is coupled
    to the backend. If status values change, update the filters here.
  Accessibility:
  - Stat cards are presented as distinct regions; assistive technologies can
    discover them via their aria-label. The quick-links list uses semantic list
    markup with role attributes for clearer navigation.
*/

// Last updated: 2025-10-21 — documentation sweep: clarified per-card loading recommendation.

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

/* DEV:
  StatCard accepts a `color` prop which should be a semantic token class
  (e.g., bg-primary, bg-secondary, bg-accent). Update colors in
  `frontend/src/custom-styles.css` to change the look site-wide rather
  than modifying utilities here. This component intentionally keeps
  presentation in tokens to support runtime theming.
*/
 
// Some editors/linters can produce a false-positive "assigned but never used"
// for locally-declared components used only in JSX below. Keep the module
// reference so tools that don't follow JSX usages won't report a false
// positive. This is intentionally minimal and safe.
const StatCard = (props) => {
  const { label, value, color } = props;

  return (
    <div className="bg-surface rounded-lg shadow p-6 card-hover" role="region" aria-label={label}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary text-sm">{label}</p>
          <p className="text-3xl font-bold mt-2 text-text-primary">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          <props.icon size={24} className="text-text-inverse" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

// StatCard is used in JSX below; no module-scope no-op is required.
// StatCard is used below in JSX; ensure it's referenced in JS as well so
// linters that don't follow JSX usage don't report it as unused.
const _statCardRef = StatCard;
void _statCardRef;

function DashboardModule() {
  const [stats, setStats] = useState({
    reservations: 0,
    jobs: 0,
    subscribers: 0,
    messages: 0
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/reservations`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/jobs`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/newsletter/subscribers`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/contact/messages`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([reservations, jobs, subscribers, messages]) => {
      setStats({
        reservations: Array.isArray(reservations) ? reservations.filter(r => r.status === 'pending').length : 0,
        jobs: Array.isArray(jobs) ? jobs.filter(j => j.status === 'new').length : 0,
        subscribers: Array.isArray(subscribers) ? subscribers.filter(s => s.is_active).length : 0,
        messages: Array.isArray(messages) ? messages.filter(m => !m.is_read).length : 0
      });
    }).catch(() => {
      // Keep stats at defaults in case of an unexpected failure.
      setStats({ reservations: 0, jobs: 0, subscribers: 0, messages: 0 });
    });
  }, []);



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={icons.Calendar} 
          label="Pending Reservations" 
          value={stats.reservations} 
          color="bg-primary" 
        />
        <StatCard 
          icon={icons.Briefcase} 
          label="New Applications" 
          value={stats.jobs} 
          color="bg-secondary" 
        />
        <StatCard 
          icon={icons.Users} 
          label="Active Subscribers" 
          value={stats.subscribers} 
          color="bg-accent" 
        />
        <StatCard 
          icon={icons.TrendingUp} 
          label="Unread Messages" 
          value={stats.messages} 
          color="bg-accent" 
        />
      </div>

      <div className="bg-surface rounded-lg shadow p-6">
  <h3 className="text-xl font-bold mb-4 font-heading text-text-primary">Welcome to Thunder Road Admin</h3>
  <p className="text-text-primary">
          Use the sidebar to navigate between different sections. Here's what you can manage:
        </p>
  <ul className="mt-4 space-y-2 text-text-primary" aria-label="Admin quick links">
          <li>• <strong>Dashboard:</strong> Overview of your business metrics</li>
          <li>• <strong>Inbox:</strong> View all notifications and messages</li>
          <li>• <strong>Menu:</strong> Manage menu categories and items</li>
          <li>• <strong>Reservations:</strong> Handle customer bookings</li>
          <li>• <strong>Jobs:</strong> Review job applications</li>
          <li>• <strong>Media:</strong> Upload and manage images</li>
          <li>• <strong>Settings:</strong> Configure business information</li>
          <li>• <strong>Newsletter:</strong> Manage email subscribers</li>
        </ul>
      </div>
    </div>
  );
}

const Module = {
  component: DashboardModule,
  name: 'Dashboard',
  icon: icons.LayoutDashboard
};

export default Module;

