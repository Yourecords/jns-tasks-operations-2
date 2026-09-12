'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Film, Plus, Menu } from 'lucide-react';
import { useUser } from './UserContext';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  onOpenQuickAction: () => void;
}

export default function MobileBottomNav({
  onOpenMenu,
  onOpenQuickAction,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { currentUser } = useUser();
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchMyTasksCount = async () => {
      try {
        const res = await fetch('/api/productions');
        const data = await res.json();
        if (data.productions) {
          let count = 0;
          data.productions.forEach((p: any) => {
            if (p.status === 'ACTIVE' && p.tasks) {
              p.tasks.forEach((t: any) => {
                if (
                  t.assignedTo === currentUser?.id &&
                  t.status !== 'DONE' &&
                  t.status !== 'CANCELLED'
                ) {
                  count++;
                }
              });
            }
          });
          setTaskCount(count);
        }
      } catch (err) {
        // quiet error
      }
    };

    fetchMyTasksCount();
    const interval = setInterval(fetchMyTasksCount, 12000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <Link
        href="/"
        className={`mobile-bottom-item ${pathname === '/' ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>

      <Link
        href="/my-tasks"
        className={`mobile-bottom-item ${pathname === '/my-tasks' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <CheckSquare size={20} />
          {taskCount > 0 && <span className="mobile-nav-badge">{taskCount}</span>}
        </div>
        <span>My Tasks</span>
      </Link>

      <button
        type="button"
        className="mobile-bottom-fab"
        onClick={onOpenQuickAction}
        aria-label="Quick Action"
        title="Quick Action"
      >
        <Plus size={24} />
      </button>

      <Link
        href="/productions"
        className={`mobile-bottom-item ${pathname?.startsWith('/productions') ? 'active' : ''}`}
      >
        <Film size={20} />
        <span>Shows</span>
      </Link>

      <button
        type="button"
        className="mobile-bottom-item"
        onClick={onOpenMenu}
        aria-label="Open Full Menu"
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
