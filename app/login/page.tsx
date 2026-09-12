'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useUser } from '@/components/UserContext';
import { ShieldCheck, AlertCircle, ArrowRight, Lock, ChevronDown, Check } from 'lucide-react';
import { User } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading: userLoading, login } = useUser();
  const [customEmail, setCustomEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccessUser, setAuthSuccessUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!userLoading && currentUser) {
      router.push('/');
    }
  }, [currentUser, userLoading, router]);

  // Check URL error parameter from NextAuth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'AccessDenied') {
        setErrorMsg('Access Denied: Only authorized @jns.org Google accounts registered in the database may sign in.');
      } else if (err) {
        setErrorMsg(`Authentication error: ${err}. Please try again.`);
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsAuthenticating(true);
    try {
      // Trigger Auth.js Google OAuth with redirect to root
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: true,
      });
      if (result?.error) {
        setErrorMsg(result.error);
        setIsAuthenticating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed to initialize.');
      setIsAuthenticating(false);
    }
  };

  const handleEmailDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = customEmail.trim().toLowerCase();

    if (!trimmed) {
      setErrorMsg('Please enter your official JNS email address.');
      return;
    }

    if (!trimmed.endsWith('@jns.org')) {
      setErrorMsg('Access Restricted: Only official @jns.org Google Workspace accounts are permitted.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await login({ email: trimmed });
      if (res.success && res.user) {
        setAuthSuccessUser(res.user);
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        setErrorMsg(res.error || `No active team profile found for ${trimmed}.`);
        setIsAuthenticating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070b13',
        backgroundImage: `
          radial-gradient(circle at 50% -20%, rgba(225, 29, 72, 0.15), transparent 45%),
          radial-gradient(circle at 50% 120%, rgba(245, 158, 11, 0.08), transparent 50%)
        `,
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '2.5rem 2rem',
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {/* Brand Emblem */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'rgba(225, 29, 72, 0.1)',
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              border: '1px solid rgba(225, 29, 72, 0.25)',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                backgroundColor: 'var(--jns-red)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '12px',
                color: '#fff',
                letterSpacing: '-0.03em',
              }}
            >
              jns
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--jns-red)', textTransform: 'uppercase' }}>
              Video Production Operations
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
          Production Task Management
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>
          Internal workflow automation, episode pipeline, studio scheduling, and gear operations for JNS.
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '12px',
              color: '#fca5a5',
              marginBottom: '1.25rem',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success State */}
        {authSuccessUser ? (
          <div
            style={{
              padding: '1.5rem 1rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
              }}
            >
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>
              Welcome back, {authSuccessUser.name}!
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Signing into JNS Video Production...
            </div>
          </div>
        ) : (
          <div>
            {/* Primary Google Workspace Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: 'none',
                borderRadius: '10px',
                padding: '0.85rem 1.25rem',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
            >
              {/* Official Google G SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google Workspace</span>
            </button>

            {/* Workspace badge hint */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '0.85rem',
              }}
            >
              <Lock size={11} color="var(--jns-gold)" />
              <span>Restricted to authorized <strong style={{ color: 'var(--jns-gold)' }}>@jns.org</strong> accounts</span>
            </div>

            {/* Direct Email Input Option (Local Development Only) */}
            {process.env.NODE_ENV !== 'production' && (
              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Development Simulation: Sign in with @jns.org email</span>
                  <ChevronDown size={13} style={{ transform: showManualInput ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {showManualInput && (
                  <form onSubmit={handleEmailDevSubmit} style={{ marginTop: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="name@jns.org"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        style={{ fontSize: '12px', height: '38px', flex: 1 }}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isAuthenticating}
                        style={{ height: '38px', padding: '0 0.85rem', fontSize: '12px' }}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Security Footer */}
        <div style={{ marginTop: '2rem', fontSize: '11px', color: 'rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <ShieldCheck size={12} />
          <span>JNS Jerusalem News Syndicate &bull; Production System v2.4</span>
        </div>
      </div>
    </div>
  );
}
