'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Minus,
  Send,
  Trash2,
  ChevronRight,
  HelpCircle,
  Film,
  Calendar,
  CheckCircle2,
  Clock,
  Car,
  Layers,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

const QUICK_PROMPTS = [
  { label: 'My Active Tasks', prompt: 'What active tasks and productions are assigned to me?', icon: CheckCircle2 },
  { label: 'Filming Schedule', prompt: 'What filming or studio shoots are scheduled for this week?', icon: Calendar },
  { label: 'Revision Rules', prompt: 'How does the revision process work and who can approve Draft 2?', icon: Layers },
  { label: 'Gett Taxi Booking', prompt: 'How do I book a Gett taxi for a studio guest?', icon: Car },
];

/**
 * Basic lightweight Markdown renderer for assistant messages (links, bold, lists).
 */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div style={{ fontSize: '13px', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--jns-gold, #e5a93c)',
                margin: '4px 0 2px',
                letterSpacing: '0.02em',
              }}
            >
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        // Bullet points
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const textContent = isBullet ? trimmed.slice(2) : trimmed;

        // Parse links [title](url) and bold **text**
        const formatted = renderFormattedText(textContent);

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginLeft: '4px' }}>
              <span style={{ color: 'var(--jns-gold, #e5a93c)', lineHeight: '18px' }}>•</span>
              <span style={{ flex: 1 }}>{formatted}</span>
            </div>
          );
        }

        return <p key={idx} style={{ margin: 0 }}>{formatted}</p>;
      })}
    </div>
  );
}

function renderFormattedText(text: string): React.ReactNode[] {
  // Regex to match [link text](url) or **bold**
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, label, url] = match;
        return (
          <Link
            key={i}
            href={url}
            style={{
              color: 'var(--jns-gold, #e5a93c)',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {label}
          </Link>
        );
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#f8fafc', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function getFirstName(user?: { name?: string; fullName?: string } | null): string {
  if (!user) return '';
  const raw = user.name?.trim() || user.fullName?.trim() || '';
  if (!raw) return '';
  return raw.split(' ')[0];
}

function createWelcomeMessage(user?: { name?: string; fullName?: string } | null): Message {
  const firstName = getFirstName(user);
  const greeting = firstName ? `👋 Hello ${firstName}!` : '👋 Hello!';
  return {
    id: 'welcome',
    role: 'assistant',
    content: `${greeting} I am the **JNS Video Operations AI Assistant**.\n\nI can help you check your active assignments, review upcoming filming schedules, look up SOP workflow rules, or navigate any production task. How can I assist you today?`,
    createdAt: Date.now(),
  };
}

export default function AiAssistantDrawer() {
  const { currentUser } = useUser();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore messages from user-scoped sessionStorage on mount or user change
  useEffect(() => {
    // Purge legacy unscoped key from previous versions to prevent cross-user greeting bleed
    try {
      sessionStorage.removeItem('jns_ai_messages');
    } catch {}

    const welcomeMsg = createWelcomeMessage(currentUser);

    if (!currentUser?.id) {
      setMessages([welcomeMsg]);
      return;
    }

    const userKey = `jns_ai_messages_${currentUser.id}`;
    try {
      const saved = sessionStorage.getItem(userKey);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always ensure the welcome message matches the current user's name
          const updated = parsed.map((m) => {
            if (m.id === 'welcome' || (m.role === 'assistant' && m.content.startsWith('👋 Hello'))) {
              return {
                ...m,
                content: createWelcomeMessage(currentUser).content,
              };
            }
            return m;
          });
          setMessages(updated);
          return;
        }
      }
    } catch {}

    setMessages([welcomeMsg]);
  }, [currentUser?.id, currentUser?.name, currentUser?.fullName]);

  // Persist messages to user-scoped sessionStorage
  useEffect(() => {
    if (!currentUser?.id || messages.length === 0) return;
    try {
      sessionStorage.setItem(`jns_ai_messages_${currentUser.id}`, JSON.stringify(messages));
    } catch {}
  }, [messages, currentUser?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const clearChat = () => {
    const welcome = createWelcomeMessage(currentUser);
    setMessages([welcome]);
    if (currentUser?.id) {
      try {
        sessionStorage.removeItem(`jns_ai_messages_${currentUser.id}`);
      } catch {}
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const payloadMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI answer');
      }

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'I could not process that request.',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error**: ${err.message || 'Unable to connect to assistant.'} Please try again.`,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <aside
      aria-label="JNS AI Assistant"
      style={{
        position: 'fixed',
        bottom: '22px',
        right: '185px',
        zIndex: 998,
        fontFamily: 'inherit',
      }}
    >
      {/* COLLAPSED FLOATING PILL BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '30px',
            background: isLight
              ? '#ffffff'
              : 'linear-gradient(135deg, rgba(20, 32, 54, 0.95) 0%, rgba(10, 16, 28, 0.98) 100%)',
            border: '1.5px solid rgba(229, 169, 60, 0.85)',
            color: 'var(--text-main, #f8fafc)',
            boxShadow: isLight
              ? '0 6px 20px rgba(0, 0, 0, 0.12), 0 0 12px rgba(229, 169, 60, 0.25)'
              : '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(229, 169, 60, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '13px',
            fontWeight: 700,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow =
              '0 12px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(229, 169, 60, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow =
              '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(229, 169, 60, 0.3)';
          }}
          title="Ask JNS AI Assistant"
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: 'rgba(229, 169, 60, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--jns-gold, #e5a93c)',
            }}
          >
            <Sparkles size={14} />
          </div>
          <span>AI Assistant</span>
        </button>
      )}

      {/* EXPANDED FLOATING ASSISTANT DRAWER */}
      {isOpen && (
        <div
          style={{
            width: '390px',
            maxWidth: '92vw',
            height: '540px',
            maxHeight: '82vh',
            borderRadius: '14px',
            background: isLight ? '#ffffff' : 'rgba(13, 21, 37, 0.97)',
            backdropFilter: 'blur(16px)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(229, 169, 60, 0.4)',
            boxShadow: isLight
              ? '0 16px 40px rgba(0, 0, 0, 0.18), 0 0 20px rgba(229, 169, 60, 0.15)'
              : '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(229, 169, 60, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* DRAWER HEADER */}
          <div
            style={{
              padding: '12px 16px',
              background: isLight
                ? 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)'
                : 'linear-gradient(90deg, #16243d 0%, #0d1525 100%)',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(229, 169, 60, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--jns-gold, #e5a93c)',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                    JNS AI Assistant
                  </span>
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                    }}
                    title="Assistant Ready"
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Production & Workflow Co-Pilot
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={clearChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear Conversation"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Minimize Drawer"
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* MESSAGE STREAM */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: isLight ? '#f8fafc' : 'transparent',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '88%',
                      padding: '10px 14px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isUser
                        ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
                        : isLight
                        ? '#ffffff'
                        : 'rgba(22, 36, 61, 0.85)',
                      color: isUser ? '#ffffff' : 'var(--text-main, #e2e8f0)',
                      border: isUser
                        ? '1px solid rgba(59, 130, 246, 0.4)'
                        : isLight
                        ? '1px solid #e2e8f0'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {isUser ? (
                      <span style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-secondary, #64748b)',
                      marginTop: '3px',
                      padding: '0 4px',
                    }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Typing / Reasoning Indicator */}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: 'rgba(22, 36, 61, 0.6)',
                  color: 'var(--jns-gold, #e5a93c)',
                  fontSize: '12px',
                  width: 'fit-content',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--jns-gold, #e5a93c)',
                    animation: 'ping 1s infinite',
                  }}
                />
                <span>Consulting JNS operations…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS (If chat has fewer than 4 messages or user wants inspiration) */}
          {messages.length <= 3 && !loading && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: isLight ? '#f1f5f9' : 'rgba(229, 169, 60, 0.1)',
                      color: isLight ? '#1e293b' : 'var(--jns-gold, #e5a93c)',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(229, 169, 60, 0.25)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={12} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* INPUT BAR */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              background: isLight ? '#ffffff' : 'rgba(10, 16, 28, 0.98)',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about tasks, filming, or workflows..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '20px',
                  background: isLight ? '#f1f5f9' : 'rgba(22, 36, 61, 0.7)',
                  border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-main, #f8fafc)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                style={{
                  background: input.trim()
                    ? 'var(--jns-gold, #e5a93c)'
                    : isLight
                    ? '#e2e8f0'
                    : 'rgba(229, 169, 60, 0.2)',
                  border: 'none',
                  color: input.trim() ? '#000000' : 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
