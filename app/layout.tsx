'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { UserProvider, useUser } from '@/components/UserContext';
import { ThemeProvider } from '@/components/ThemeContext';
import Sidebar from '@/components/Sidebar';
import TopNavbar from '@/components/TopNavbar';
import SearchModal from '@/components/SearchModal';
import QuickActionModal from '@/components/QuickActionModal';
import MobileBottomNav from '@/components/MobileBottomNav';

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  // Auth Guard: redirect unauthenticated users to /login
  useEffect(() => {
    if (!loading) {
      if (!currentUser && !isLoginPage) {
        router.push('/login');
      } else if (currentUser && isLoginPage) {
        router.push('/');
      }
    }
  }, [currentUser, loading, isLoginPage, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'newEpisode' || params.get('modal') === 'quickAction') {
        setQuickActionOpen(true);
      }
    }
  }, []);

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#070b13', color: 'var(--text-muted)', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--jns-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Loading JNS Video Production...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <div className="app-container">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />
        )}
        <div className="main-wrapper">
          <TopNavbar
            onOpenMobileMenu={() => setMobileOpen(!mobileOpen)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenQuickAction={() => setQuickActionOpen(true)}
          />
          <main className="content-body">{children}</main>
        </div>
      </div>

      <MobileBottomNav
        onOpenMenu={() => setMobileOpen(true)}
        onOpenQuickAction={() => setQuickActionOpen(true)}
      />

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>JNS Video Production Task Management</title>
        <meta
          name="description"
          content="Purpose-built daily operations system for the JNS Video Production department."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/jns-logo-red.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var params = new URLSearchParams(window.location.search);
                var theme = params.get('theme') || localStorage.getItem('jns_theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'light') {
                  document.documentElement.classList.add('theme-light');
                  document.documentElement.classList.remove('theme-dark');
                } else {
                  document.documentElement.classList.add('theme-dark');
                  document.documentElement.classList.remove('theme-light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>
            <AppShell>{children}</AppShell>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
