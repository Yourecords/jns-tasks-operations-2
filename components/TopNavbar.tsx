'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Calendar,
  Mail,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useUser } from './UserContext';
import { useTheme } from './ThemeContext';
import { InAppNotification } from '@/lib/types';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onOpenQuickAction: () => void;
}

export default function TopNavbar({
  onOpenMobileMenu,
  onOpenSearch,
  onOpenQuickAction,
}: TopNavbarProps) {
  const { currentUser, settings, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markNotificationRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSeed = async () => {
    if (confirm('Reset entire system database back to initial demo seed data?')) {
      setResetting(true);
      try {
        await fetch('/api/reset', { method: 'POST' });
        window.location.reload();
      } catch (err) {
        alert('Reset failed');
        setResetting(false);
      }
    }
  };

  const scheduleUrl = settings?.scheduleUrl || 'https://calendar.google.com';
  const defaultComposeUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=production@jns.org';
  const rawEmailUrl = settings?.productionEmailUrl;
  const productionEmailUrl = (rawEmailUrl && !rawEmailUrl.startsWith('mailto:') && rawEmailUrl !== 'https://gmail.com')
    ? rawEmailUrl
    : defaultComposeUrl;
  const canSeeEmail = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="mobile-brand-link" title="JNS Video Production">
          <img src="/jns-logo-red.png" alt="JNS" className="mobile-brand-logo" />
        </Link>

        <button
          className="global-search-trigger"
          onClick={onOpenSearch}
          aria-label="Universal search"
        >
          <Search size={15} />
          <span className="search-text-full">Search shows, tasks, records...</span>
          <span className="search-text-short">Search...</span>
          <span className="kbd-shortcut">Ctrl K</span>
        </button>
      </div>

      <div className="top-navbar-right">
        {/* Quick Action Button */}
        <button
          className="btn btn-primary btn-sm top-nav-quick-btn"
          onClick={onOpenQuickAction}
          title="Create New Episode, Pilot, Rental, or Request"
        >
          <Plus size={15} />
          <span className="quick-action-text">Quick Action</span>
        </button>

        {/* Schedule direct link */}
        <a
          href={scheduleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm nav-tool-shortcut"
          title="Open JNS Production Schedule in a new tab"
        >
          <Calendar size={14} color="var(--jns-gold)" />
          <span style={{ display: 'none', minWidth: '60px' }}>Schedule</span>
        </a>

        {/* Production Email direct link */}
        {canSeeEmail && (
          <a
            href={productionEmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm nav-tool-shortcut"
            title="Compose Email to JNS Production (Gmail: production@jns.org)"
          >
            <Mail size={14} color="var(--jns-blue)" />
            <span style={{ display: 'none', minWidth: '60px' }}>Email</span>
          </a>
        )}

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            title="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifPopover && (
            <div
              style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '310px',
                maxWidth: 'calc(100vw - 1.5rem)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                <button
                  onClick={() => setShowNotifPopover(false)}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '1rem', textAlign: 'center' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.1)',
                        marginBottom: '0.35rem',
                        cursor: 'pointer',
                        borderLeft: n.isRead ? '2px solid transparent' : '2px solid var(--jns-blue)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher Toggle */}
        <button
          type="button"
          className="btn btn-secondary btn-sm nav-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode (Regular Mode)' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            border: theme === 'dark' ? '1px solid rgba(229, 169, 60, 0.4)' : '1px solid #cbd5e1',
            backgroundColor: theme === 'dark' ? 'rgba(229, 169, 60, 0.08)' : '#f8fafc',
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={13} color="#f59e0b" />
              <span className="reset-demo-text" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Light</span>
            </>
          ) : (
            <>
              <Moon size={13} color="#6366f1" />
              <span className="reset-demo-text" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Dark</span>
            </>
          )}
        </button>

        {/* Reset Demo Data Helper */}
        <button
          className="btn btn-secondary btn-sm nav-reset-btn"
          onClick={handleResetSeed}
          disabled={resetting}
          title="Reset database to demo seed data"
          style={{ fontSize: '11px', opacity: 0.8 }}
        >
          <RefreshCw size={12} className={resetting ? 'spin' : ''} />
          <span className="reset-demo-text">Reset Demo</span>
        </button>

        {/* Logout Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Sign out of JNS Video Production"
          style={{ fontSize: '11px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
        >
          <LogOut size={12} />
          <span className="reset-demo-text">Log Out</span>
        </button>
      </div>
    </header>
  );
}
