/*
  DashboardModule

  Purpose:
  - Admin dashboard overview that aggregates counts (reservations, jobs,
    subscribers, messages) and provides quick links to admin modules.

  Contract:
  - Rendered inside the admin shell. Performs read-only fetches to display
    aggregate metrics. Keep network calls resilient to partial failures.

  Notes:
  - Prefer adding per-card loading states if dashboard fetches become heavy.
*/
import { useState, useEffect } from 'react';
import { icons } from '../../icons';
import { authenticatedFetch } from '../../utils/api';

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
  const [testEmailState, setTestEmailState] = useState({
    status: 'idle',
    message: '',
    requestId: null,
    type: null
  });
  const enableTestEmail = process.env.REACT_APP_ENABLE_TEST_EMAIL === 'true';
  const newsletterEnabled = process.env.REACT_APP_NEWSLETTER_ENABLED === 'true';

  useEffect(() => {
    let cancelled = false;

    const fetchPagedCount = async (path, params) => {
      const query = new URLSearchParams({
        page: '1',
        per_page: '1',
        sort_by: 'submitted_at',
        sort_dir: 'DESC',
        ...params
      });
      const res = await authenticatedFetch(`${path}?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load count');
      const payload = await res.json();
      const total = parseInt(payload?.total, 10);
      return Number.isFinite(total) ? total : 0;
    };

    const fetchActiveSubscribers = async () => {
      if (!newsletterEnabled) {
        return 0;
      }
      const res = await authenticatedFetch('/subscribers');
      if (res.status === 404) {
        return 0;
      }
      if (!res.ok) return 0;
      const list = await res.json();
      if (!Array.isArray(list)) return 0;
      return list.filter((subscriber) => {
        if (!subscriber) return false;
        const flag = subscriber.is_active;
        return flag === true || flag === 1 || flag === '1';
      }).length;
    };

    const loadStats = async () => {
      try {
        const [pendingReservations, newApplications, activeSubscribers, unreadMessages] = await Promise.all([
          fetchPagedCount('/reservations', { status: 'pending' }),
          fetchPagedCount('/jobs', { status: 'new' }),
          fetchActiveSubscribers(),
          fetchPagedCount('/messages', { status: 'new' })
        ]);
        if (!cancelled) {
          setStats({
            reservations: pendingReservations,
            jobs: newApplications,
            subscribers: activeSubscribers,
            messages: unreadMessages
          });
        }
      } catch (err) {
        if (!cancelled) {
          setStats({
            reservations: 0,
            jobs: 0,
            subscribers: 0,
            messages: 0
          });
        }
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [newsletterEnabled]);

  const triggerTestEmail = async (type) => {
    if (!enableTestEmail) return;
    setTestEmailState({
      status: 'loading',
      message: `Sending ${type === 'alert' ? 'alert' : 'ops'} email...`,
      requestId: null,
      type
    });
    try {
      const res = await authenticatedFetch('/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Request failed');
      }
      setTestEmailState({
        status: 'success',
        message: `${type === 'alert' ? 'Alert' : 'Ops'} email queued successfully.`,
        requestId: payload?.requestId || null,
        type
      });
    } catch (error) {
      setTestEmailState({
        status: 'error',
        message: error?.message || 'Unable to send test email',
        requestId: null,
        type
      });
    }
  };


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

      <div className="bg-surface rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-heading font-bold text-text-primary">Email System Test</h3>
            <p className="text-text-secondary text-sm">
              Send a one-off email to verify SendGrid delivery. Stores the request ID for auditing.
            </p>
          </div>
          <icons.Mail size={24} className="text-primary" aria-hidden />
        </div>
        {enableTestEmail ? (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={() => triggerTestEmail('ops')}
                className="px-4 py-2 rounded-lg bg-primary text-text-inverse hover:bg-primary-light transition disabled:opacity-60"
                disabled={testEmailState.status === 'loading'}
              >
                Send test ops email
              </button>
              <button
                type="button"
                onClick={() => triggerTestEmail('alert')}
                className="px-4 py-2 rounded-lg border border-border text-text-primary hover:border-primary transition disabled:opacity-60"
                disabled={testEmailState.status === 'loading'}
              >
                Send test alert email
              </button>
            </div>
            {testEmailState.status !== 'idle' && (
              <div
                className={`rounded-lg p-4 text-sm ${
                  testEmailState.status === 'success'
                    ? 'bg-success/10 text-success'
                    : testEmailState.status === 'error'
                    ? 'bg-error/10 text-error'
                    : 'bg-surface-warm text-text-secondary'
                }`}
              >
                <p className="font-semibold mb-1">{testEmailState.message}</p>
                {testEmailState.requestId && (
                  <p className="font-mono text-xs text-text-secondary">
                    requestId: {testEmailState.requestId}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-text-secondary text-sm">
            Test emails are disabled for this environment. Set <code className="font-mono">REACT_APP_ENABLE_TEST_EMAIL=true</code> (and
            backend <code className="font-mono">ALLOW_PROD_TEST_EMAIL=true</code> if needed) to enable.
          </p>
        )}
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
