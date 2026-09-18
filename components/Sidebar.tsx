'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Compass,
  Building2,
  CheckSquare,
  Lightbulb,
  Sparkles,
  Users,
  Wrench,
  Calendar,
  Mail,
  Archive,
  Settings,
  ChevronDown,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
  X,
  Pencil,
  Camera,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  Eye,
  Car,
} from 'lucide-react';
import { useUser } from './UserContext';
import { useTheme } from './ThemeContext';
import { isEligibleEditor, canManageTaxis } from '@/lib/utils';
import UpdateScheduleModal from './UpdateScheduleModal';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenViewAs?: () => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen, onOpenViewAs }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, canImpersonate, isImpersonating, logout, settings, refreshSettings } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({
    myTasks: 0,
    overdue: 0,
    blocked: 0,
    waitingApproval: 0,
    activeTaxis: 0,
  });

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/productions');
      const data = await res.json();
      let activeTaxisCount = 0;

      try {
        const taxiRes = await fetch('/api/taxis');
        if (taxiRes.ok) {
          const taxiData = await taxiRes.json();
          activeTaxisCount = taxiData.activeCount || 0;
        }
      } catch (e) {
        // ignore taxi badge fetch error
      }

      if (data.productions) {
        let myCount = 0;
        let overdueCount = 0;
        let blockedCount = 0;
        let approvalCount = 0;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        data.productions.forEach((p: any) => {
          if (p.status === 'ACTIVE') {
            if (p.currentStage === 'PRODUCER_REVIEW' || p.currentStage === 'FINAL_APPROVAL') {
              approvalCount++;
            }
            p.tasks?.forEach((t: any) => {
              if (t.status !== 'COMPLETED') {
                if (currentUser && t.assignedUserId === currentUser.id) {
                  myCount++;
                }
                if (t.status === 'BLOCKED') {
                  blockedCount++;
                }
                if (t.dueDate && t.dueDate < todayStr) {
                  overdueCount++;
                }
              }
            });
          }
        });

        setBadgeCounts({
          myTasks: myCount,
          overdue: overdueCount,
          blocked: blockedCount,
          waitingApproval: approvalCount,
          activeTaxis: activeTaxisCount,
        });
      }
    } catch (err) {
      console.error('Error fetching badge counts', err);
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Productions', href: '/productions', icon: Film },
    { label: 'Pilots', href: '/pilots', icon: Compass },
    { label: 'Studio Rentals', href: '/rentals', icon: Building2 },
    { label: 'Production Calendar', href: '/calendar', icon: Calendar },
    ...(canManageTaxis(currentUser)
      ? [
          {
            label: 'Guest Taxis (Gett)',
            href: '/taxis',
            icon: Car,
            badge: badgeCounts.activeTaxis > 0 ? badgeCounts.activeTaxis : undefined,
            badgeClass: 'nav-badge-blue',
          },
        ]
      : []),
    {
      label: 'My Tasks',
      href: '/my-tasks',
      icon: CheckSquare,
      badge: badgeCounts.myTasks > 0 ? badgeCounts.myTasks : undefined,
      badgeClass: 'nav-badge-gold',
    },
    { label: 'Improvements', href: '/improvements', icon: Lightbulb },
    { label: 'New Show Ideas', href: '/show-ideas', icon: Sparkles },
    { label: 'Meetings', href: '/meetings', icon: Users },
    { label: 'Equipment Needed', href: '/equipment', icon: Wrench },
    { label: 'Archive', href: '/archive', icon: Archive },
  ];

  const scheduleUrl = settings?.scheduleUrl || 'https://calendar.google.com';
  const defaultComposeUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=production@jns.org';
  const rawEmailUrl = settings?.productionEmailUrl;
  const productionEmailUrl = (rawEmailUrl && !rawEmailUrl.startsWith('mailto:') && rawEmailUrl !== 'https://gmail.com')
    ? rawEmailUrl
    : defaultComposeUrl;
  const canSeeEmail = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <Link href="/" className="brand-badge" onClick={() => setMobileOpen(false)}>
            <img
              src="/jns-logo-red.png"
              alt="JNS"
              className="brand-logo-img"
            />
            <div>
              <div className="brand-title">Video Production</div>
              <div className="brand-subtitle">Task Operations</div>
            </div>
          </Link>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="nav-link-left">
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`nav-badge ${item.badgeClass || ''}`}>{item.badge}</span>
              )}
            </Link>
          );
        })}

        <div className="nav-section-title">Production Tools</div>
        <div className="nav-tool-wrapper">
          <a
            href={scheduleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            title="Open JNS Production Schedule in a new tab"
          >
            <div className="nav-link-left">
              <Calendar size={18} />
              <span>Schedule</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>↗</span>
          </a>
          {(currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN') && (
            <button
              type="button"
              className="nav-tool-edit-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setScheduleModalOpen(true);
              }}
              title="Update Production Schedule Link (Producers & Department Head)"
              aria-label="Update Schedule Link"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {canSeeEmail && (
          <a
            href={productionEmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            title="Compose Email to JNS Production (Gmail: production@jns.org)"
          >
            <div className="nav-link-left">
              <Mail size={18} />
              <span>Production Email</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>↗</span>
          </a>
        )}

        {/* Studio Gear Log (Restricted to Yuri & Ahron Only) */}
        {(currentUser?.role === 'ADMIN' ||
          currentUser?.jobFunction === 'STUDIO_OPERATOR' ||
          currentUser?.id === 'usr_yuri_admin' ||
          currentUser?.id === 'usr_ahron_studio') && (
          <Link
            href="/gear-log"
            className={`nav-link ${pathname === '/gear-log' ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Equipment Checkout & Studio Gear Log (Yuri & Ahron Only)"
          >
            <div className="nav-link-left">
              <Camera size={18} />
              <span>Studio Gear Log</span>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              RESTRICTED
            </span>
          </Link>
        )}

        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'PRODUCER') && (
          <>
            <div className="nav-section-title">Administration</div>
            <Link
              href="/admin"
              className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="nav-link-left">
                <Settings size={18} />
                <span>Admin / Settings</span>
              </div>
            </Link>

            {/* Turnaround Analytics (Admin Yuri Only) */}
            {currentUser?.role === 'ADMIN' && (
              <Link
                href="/analytics"
                className={`nav-link ${pathname === '/analytics' ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title="Production Analytics & Turnaround Velocity (Admin Only)"
              >
                <div className="nav-link-left">
                  <TrendingUp size={18} />
                  <span>Turnaround Analytics</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--jns-gold)' }}>
                  ADMIN
                </span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* User Persona Switcher & Theme Control */}
      <div className="sidebar-footer">
        {/* Theme Switcher Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', padding: '0 0.2rem' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Appearance
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode (Regular Mode)' : 'Switch to Dark Mode'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              border: theme === 'dark' ? '1px solid rgba(229, 169, 60, 0.35)' : '1px solid #cbd5e1',
              backgroundColor: theme === 'dark' ? 'rgba(229, 169, 60, 0.08)' : '#f8fafc',
              color: 'var(--text-main)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={12} color="#f59e0b" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Moon size={12} color="#6366f1" />
                <span>Light</span>
              </>
            )}
          </button>
        </div>

        {/* View Site As Option (Admin Only) */}
        {canImpersonate && onOpenViewAs && (
          <button
            type="button"
            onClick={onOpenViewAs}
            title="View site from any team member's perspective"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              marginBottom: '0.65rem',
              borderRadius: 'var(--radius-md)',
              border: isImpersonating ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              backgroundColor: isImpersonating ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card-subtle)',
              color: isImpersonating ? '#fbbf24' : 'var(--text-light)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={13} color={isImpersonating ? '#fbbf24' : 'var(--jns-gold)'} />
            <span>{isImpersonating ? `Switch View (${currentUser?.name?.split(' ')[0]})` : 'View Site As User...'}</span>
          </button>
        )}

        <div className="user-persona-box" style={{ cursor: 'default' }}>
          <div className="user-persona-info">
            <div className="user-avatar">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div>
              <div className="user-meta-name" title={currentUser?.fullName || currentUser?.name}>
                {currentUser?.name || 'Loading...'}
              </div>
              <div className="user-meta-role">
                <ShieldCheck size={11} color="var(--jns-gold)" />
                <span>{currentUser?.positionDisplay || currentUser?.role}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out of JNS Operations"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <UpdateScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </aside>
  );
}
