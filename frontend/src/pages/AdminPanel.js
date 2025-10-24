import React, { useState, useEffect } from 'react';
import { icons } from '../icons';
import ThemeToggle from '../components/ThemeToggle';
import DashboardModule from '../components/admin/DashboardModule';
import InboxModule from '../components/admin/InboxModule';
import MenuModule from '../components/admin/MenuModule';
import ReservationsModule from '../components/admin/ReservationsModule';
import JobsModule from '../components/admin/JobsModule';
import MediaModule from '../components/admin/MediaModule';
import SettingsModule from '../components/admin/SettingsModule';
import NewsletterModule from '../components/admin/NewsletterModule';
import Snackbar from '../components/ui/Snackbar';

const AdminModules = {
  dashboard: { component: DashboardModule, name: 'Dashboard', icon: icons.LayoutDashboard },
  inbox: { component: InboxModule, name: 'Messages', icon: icons.Inbox },
  menu: { component: MenuModule, name: 'Menu', icon: icons.UtensilsCrossed },
  reservations: { component: ReservationsModule, name: 'Reservations', icon: icons.Calendar },
  jobs: { component: JobsModule, name: 'Jobs', icon: icons.Briefcase },
  media: { component: MediaModule, name: 'Media', icon: icons.Image },
  settings: { component: SettingsModule, name: 'Settings', icon: icons.Settings },
  newsletters: { component: NewsletterModule, name: 'Newsletter', icon: icons.Mail },
};

export default function AdminPanel({ user = { name: 'Admin' }, onLogout = () => {}, onBackToSite = () => {} }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');

  const [siteSettings, setSiteSettings] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((s) => {
        if (mounted) setSiteSettings(s || {});
      })
      .catch(() => {});

    const handler = (e) => {
      if (mounted) setSiteSettings(e?.detail || {});
    };

    window.addEventListener('siteSettingsUpdated', handler);
    return () => {
      mounted = false;
      window.removeEventListener('siteSettingsUpdated', handler);
    };
  }, [API_BASE]);

  // siteSettings updated via API and 'siteSettingsUpdated' events

  const registryEntry = AdminModules[activeModule];
  const candidate = registryEntry?.component || registryEntry;
  const CurrentModule = candidate?.component ? candidate.component : candidate;

  return (
    <div className="min-h-screen bg-admin-pageBg flex">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-surface-dark text-text-inverse transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-divider">
          <div className="flex items-center gap-3">
            {siteSettings?.logo_url ? (
              <>
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings?.business_name || 'Site logo'}
                  className="h-8 object-contain"
                />
                {sidebarOpen && (
                  <span className="text-sm font-heading font-bold text-text-inverse">TRBG ADMIN</span>
                )}
              </>
            ) : (
              <div className="font-heading font-bold text-lg text-text-inverse">
                {siteSettings?.business_name || 'Thunder Road'}
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? React.createElement(icons.X, { size: 20 }) : React.createElement(icons.Menu, { size: 20 })}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Object.entries(AdminModules).map(([key, moduleEntry]) => {
            const entry = moduleEntry.component ? moduleEntry : { component: moduleEntry, name: moduleEntry.name || key, icon: moduleEntry.icon || icons.Home };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveModule(key)}
                aria-pressed={activeModule === key}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeModule === key ? 'bg-primary text-text-inverse' : 'text-text-inverse'
                }`}
              >
                {React.createElement(entry.icon || icons.Home, { size: 20 })}
                {sidebarOpen && <span className="text-sm font-medium text-text-inverse">{entry.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-divider space-y-2">
          <button
            onClick={onBackToSite}
            className="w-full text-left px-3 py-2 rounded-lg border border-divider text-text-primary hover:bg-surface-warm"
          >
            Back to Site
          </button>
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg bg-error text-text-inverse hover:bg-error-muted"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface shadow-sm border-b border-divider px-8 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-heading font-bold text-text-inverse">{AdminModules[activeModule]?.name}</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-text-inverse">
              Welcome, <strong>{user?.name || 'Admin'}</strong>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-text-inverse font-bold">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            {React.createElement(ThemeToggle, { inline: true, className: 'ml-4' })}
          </div>
        </header>

        <section className="flex-1 overflow-auto p-8">
          {CurrentModule ? <CurrentModule /> : <div className="text-center py-12">Module not found</div>}
  </section>

  {React.createElement(Snackbar)}
      </main>
    </div>
  );
}

