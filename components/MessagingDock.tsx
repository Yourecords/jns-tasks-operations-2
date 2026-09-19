'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  X,
  Minus,
  Users,
  User,
  Paperclip,
  ChevronLeft,
  Search,
  Film,
  Sparkles,
  ExternalLink,
  Pencil,
  Check,
  Clock,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { ChatMessage, Production } from '@/lib/types';

export default function MessagingDock() {
  const { currentUser, allUsers } = useUser();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Dock States
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'TEAM' | 'DIRECT'>('TEAM');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  // Message Data
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamUnreadCount, setTeamUnreadCount] = useState(0);
  const [dmUnreadCounts, setDmUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Form State
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [dmSearch, setDmSearch] = useState('');

  // Editing Message States (1-Hour Edit Window)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Production Attachment Modal
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachedProd, setAttachedProd] = useState<{ id: string; title: string } | null>(null);
  const [availableProductions, setAvailableProductions] = useState<Production[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch active productions for attachment option
  useEffect(() => {
    if (isOpen) {
      fetch('/api/productions')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.productions)) {
            setAvailableProductions(data.productions.slice(0, 10));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Fetch messages from API
  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      let url = '/api/messages';
      if (isOpen) {
        if (activeTab === 'TEAM') {
          url += '?channelType=TEAM';
        } else if (activeTab === 'DIRECT' && selectedRecipientId) {
          url += `?channelType=DIRECT&recipientId=${selectedRecipientId}`;
        }
      }

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      setTeamUnreadCount(data.teamUnreadCount || 0);
      setDmUnreadCounts(data.dmUnreadCounts || {});
      setTotalUnreadCount(data.totalUnreadCount || 0);

      if (isOpen) {
        setMessages(data.messages || []);
      }
    } catch {
      // ignore network glitch
    }
  };

  // Mark current conversation as read
  const markAsRead = async () => {
    if (!currentUser || !isOpen) return;
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: activeTab,
          recipientId: activeTab === 'DIRECT' ? selectedRecipientId : undefined,
        }),
      });
      // Refresh counts locally
      if (activeTab === 'TEAM') {
        setTeamUnreadCount(0);
      } else if (activeTab === 'DIRECT' && selectedRecipientId) {
        setDmUnreadCounts((prev) => ({ ...prev, [selectedRecipientId]: 0 }));
      }
    } catch {
      // ignore
    }
  };

  // Polling every 4 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, selectedRecipientId, currentUser]);

  // Auto mark as read when window opens or channel changes
  useEffect(() => {
    if (isOpen) {
      markAsRead();
    }
  }, [isOpen, activeTab, selectedRecipientId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || !currentUser) return;

    if (activeTab === 'DIRECT' && !selectedRecipientId) return;

    setSending(true);
    const content = inputText.trim();
    const prodToAttach = attachedProd;

    setInputText('');
    setAttachedProd(null);
    setShowAttachMenu(false);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: activeTab,
          recipientId: activeTab === 'DIRECT' ? selectedRecipientId : undefined,
          content,
          productionId: prodToAttach?.id,
          productionTitle: prodToAttach?.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      setInputText(content);
      setAttachedProd(prodToAttach);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // 1-Hour Time Window for Message Editing
  const isEditable = (createdAt: string) => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return elapsed >= 0 && elapsed <= ONE_HOUR_MS;
  };

  const handleStartEdit = (msg: ChatMessage) => {
    if (!isEditable(msg.createdAt)) return;
    setEditingMessageId(msg.id);
    setEditInputText(msg.content);
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInputText('');
    setEditError('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editInputText.trim()) {
      setEditError('Message cannot be empty');
      return;
    }
    setEditLoading(true);
    setEditError('');

    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          content: editInputText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to edit message');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: editInputText.trim(), isEdited: true, editedAt: new Date().toISOString() }
            : m
        )
      );
      setEditingMessageId(null);
      setEditInputText('');
    } catch {
      setEditError('Network error while saving edit');
    } finally {
      setEditLoading(false);
    }
  };

  if (!currentUser) return null;

  // Selected recipient user object
  const selectedRecipient = allUsers.find((u) => u.id === selectedRecipientId);

  // Filtered direct message contacts
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);
  const filteredContacts = otherUsers.filter((u) => {
    const q = dmSearch.toLowerCase();
    const nameMatch = (u.fullName || u.name).toLowerCase().includes(q);
    const roleMatch = (u.jobFunction || u.role).toLowerCase().includes(q);
    return nameMatch || roleMatch;
  });

  const totalDmUnread = Object.values(dmUnreadCounts).reduce((acc, c) => acc + c, 0);

  return (
    <aside
      aria-label="JNS Team Chat Floating Dock"
      style={{
        position: 'fixed',
        bottom: '22px',
        right: '24px',
        zIndex: 999,
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
            padding: '10px 18px',
            borderRadius: '30px',
            background: isLight ? '#ffffff' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1.5px solid var(--jns-gold)',
            color: 'var(--text-main)',
            boxShadow: isLight
              ? '0 6px 20px rgba(0, 0, 0, 0.12), 0 0 10px rgba(201, 138, 36, 0.2)'
              : '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(212, 160, 23, 0.25)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '13px',
            fontWeight: 700,
          }}
          title="Open JNS Team Comms"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MessageSquare size={17} color="var(--jns-gold)" />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-3px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#22c55e',
                border: isLight ? '1px solid #ffffff' : '1px solid #0f172a',
              }}
            />
          </div>
          <span>Team Chat</span>

          {totalUnreadCount > 0 && (
            <span
              style={{
                background: 'var(--jns-gold)',
                color: '#000',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 900,
                boxShadow: '0 0 8px rgba(212, 160, 23, 0.6)',
              }}
            >
              {totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* EXPANDED FLOATING CHAT WINDOW */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            maxWidth: '94vw',
            height: '520px',
            maxHeight: '82vh',
            borderRadius: '14px',
            background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(212, 160, 23, 0.35)',
            boxShadow: isLight
              ? '0 16px 40px rgba(0, 0, 0, 0.15), 0 0 20px rgba(201, 138, 36, 0.12)'
              : '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(212, 160, 23, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* TOP HEADER */}
          <div
            style={{
              padding: '10px 14px',
              background: isLight
                ? 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)'
                : 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                JNS Team Comms
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Minimize"
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
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

          {/* CHANNEL TABS: TEAM vs PRIVATE DMS */}
          <div
            style={{
              display: 'flex',
              background: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
              padding: '4px 8px',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
              gap: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('TEAM');
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: isLight ? (activeTab === 'TEAM' ? '1px solid #e2e8f0' : '1px solid transparent') : 'none',
                background: activeTab === 'TEAM'
                  ? (isLight ? '#ffffff' : 'rgba(212, 160, 23, 0.18)')
                  : 'transparent',
                color: activeTab === 'TEAM' ? 'var(--jns-gold)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'TEAM' && isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                fontWeight: activeTab === 'TEAM' ? 800 : 600,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={13} />
              <span># General Team</span>
              {teamUnreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--jns-gold)',
                    color: '#000',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '8px',
                  }}
                >
                  {teamUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('DIRECT');
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: isLight ? (activeTab === 'DIRECT' ? '1px solid #e2e8f0' : '1px solid transparent') : 'none',
                background: activeTab === 'DIRECT'
                  ? (isLight ? '#ffffff' : 'rgba(212, 160, 23, 0.18)')
                  : 'transparent',
                color: activeTab === 'DIRECT' ? 'var(--jns-gold)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'DIRECT' && isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                fontWeight: activeTab === 'DIRECT' ? 800 : 600,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <User size={13} />
              <span>Direct Messages</span>
              {totalDmUnread > 0 && (
                <span
                  style={{
                    background: '#e879f9',
                    color: '#000',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '8px',
                  }}
                >
                  {totalDmUnread}
                </span>
              )}
            </button>
          </div>

          {/* MAIN BODY AREA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* VIEW 1: DIRECT MESSAGES DIRECTORY (When on DMs and no recipient chosen) */}
            {activeTab === 'DIRECT' && !selectedRecipientId && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px', background: isLight ? '#f8fafc' : 'transparent' }}>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search
                    size={13}
                    style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-secondary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search crew members..."
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '8px',
                      background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.6)',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid var(--border-color, #334155)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredContacts.map((contact) => {
                    const unread = dmUnreadCounts[contact.id] || 0;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedRecipientId(contact.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isLight ? '1px solid #e2e8f0' : '1px solid transparent',
                          background: unread > 0
                            ? (isLight ? '#fdf2f8' : 'rgba(232, 121, 249, 0.1)')
                            : (isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.4)'),
                          boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isLight
                                ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                                : 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                              border: isLight ? '1px solid #cbd5e1' : '1px solid var(--border-color, #475569)',
                              color: 'var(--jns-gold)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                            }}
                          >
                            {contact.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {contact.fullName || contact.name}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                              {contact.positionDisplay || contact.jobFunction?.replace(/_/g, ' ') || contact.role}
                            </div>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span
                            style={{
                              background: '#e879f9',
                              color: '#000',
                              fontSize: '10px',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: ACTIVE CONVERSATION (Team Channel OR Active Direct Message) */}
            {(activeTab === 'TEAM' || selectedRecipientId) && (
              <>
                {/* Channel / DM Subheader */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: isLight ? '#f8fafc' : 'rgba(30, 41, 59, 0.5)',
                    borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {activeTab === 'TEAM' ? (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--jns-gold)' }}>
                        # General Team Group
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Visible to all producers, editors & studio crew
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipientId(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--jns-gold)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: 0,
                        }}
                      >
                        <ChevronLeft size={14} />
                        <span>All Members</span>
                      </button>
                      <span style={{ color: isLight ? '#cbd5e1' : 'var(--border-color, #475569)' }}>|</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {selectedRecipient?.fullName || selectedRecipient?.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: isLight ? '#f8fafc' : 'transparent',
                  }}
                >
                  {messages.length === 0 ? (
                    <div
                      style={{
                        padding: '2.5rem 1rem',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                      }}
                    >
                      <Sparkles size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <p style={{ margin: 0 }}>
                        {activeTab === 'TEAM'
                          ? 'Welcome to the #General Team channel. Say hi to the crew!'
                          : `Start a direct conversation with ${selectedRecipient?.name}.`}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const msgTime = new Date(msg.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {/* Sender name & time */}
                          {!isMe && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', paddingLeft: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                                {msg.senderName}
                              </span>
                              {msg.senderRole && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    background: msg.senderRole === 'PRODUCER' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(232, 121, 249, 0.2)',
                                    color: msg.senderRole === 'PRODUCER' ? '#93c5fd' : '#f0abfc',
                                  }}
                                >
                                  {msg.senderRole}
                                </span>
                              )}
                              <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                {msgTime}
                              </span>
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            style={{
                              maxWidth: '85%',
                              padding: '8px 12px',
                              borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              background: isMe
                                ? (isLight
                                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                                    : 'linear-gradient(135deg, rgba(212, 160, 23, 0.28) 0%, rgba(30, 41, 59, 0.95) 100%)')
                                : (isLight
                                    ? '#ffffff'
                                    : 'rgba(30, 41, 59, 0.9)'),
                              border: isMe
                                ? (isLight ? '1px solid #fcd34d' : '1px solid rgba(212, 160, 23, 0.45)')
                                : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                              boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                              color: isMe
                                ? (isLight ? '#78350f' : '#fef08a')
                                : 'var(--text-main)',
                              fontSize: '12.5px',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}
                          >
                            {isMe && editingMessageId === msg.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <textarea
                                  value={editInputText}
                                  onChange={(e) => setEditInputText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(msg.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  autoFocus
                                  rows={2}
                                  placeholder="Edit your message..."
                                  style={{
                                    width: '100%',
                                    background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.9)',
                                    border: isLight ? '1px solid #d97706' : '1px solid var(--jns-gold)',
                                    borderRadius: '6px',
                                    color: isLight ? '#0f172a' : '#fff',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    resize: 'none',
                                    outline: 'none',
                                  }}
                                />
                                {editError && (
                                  <div style={{ color: isLight ? '#dc2626' : '#fca5a5', fontSize: '10.5px' }}>{editError}</div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={editLoading}
                                    style={{
                                      background: 'transparent',
                                      border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.2)',
                                      color: 'var(--text-secondary)',
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '10.5px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(msg.id)}
                                    disabled={editLoading || !editInputText.trim()}
                                    style={{
                                      background: 'var(--jns-gold)',
                                      border: 'none',
                                      color: '#000',
                                      fontWeight: 800,
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '10.5px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Check size={11} />
                                    <span>{editLoading ? 'Saving...' : 'Save'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>{msg.content}</div>

                                {/* Attached Production Reference */}
                                {msg.productionId && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      paddingTop: '6px',
                                      borderTop: isLight
                                        ? '1px solid rgba(0, 0, 0, 0.08)'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                  >
                                    <Link
                                      href={`/productions/${msg.productionId}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        color: isLight ? '#92400e' : 'var(--jns-gold)',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        background: isLight ? 'rgba(201, 138, 36, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                                        border: isLight ? '1px solid rgba(201, 138, 36, 0.25)' : 'none',
                                        padding: '3px 7px',
                                        borderRadius: '5px',
                                      }}
                                    >
                                      <Film size={11} />
                                      <span>{msg.productionTitle || 'Linked Production'}</span>
                                      <ExternalLink size={10} />
                                    </Link>
                                  </div>
                                )}

                                {/* Timestamp, Edited tag & Edit button for author within 1 hour */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                    gap: '6px',
                                    marginTop: '4px',
                                  }}
                                >
                                  {msg.isEdited && (
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontStyle: 'italic',
                                        color: isMe
                                          ? (isLight ? 'rgba(120, 53, 15, 0.7)' : 'rgba(254, 240, 138, 0.6)')
                                          : 'var(--text-muted)',
                                      }}
                                      title={msg.editedAt ? `Edited at ${new Date(msg.editedAt).toLocaleTimeString()}` : 'Edited'}
                                    >
                                      (edited)
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      color: isMe
                                        ? (isLight ? 'rgba(120, 53, 15, 0.7)' : 'rgba(254, 240, 138, 0.6)')
                                        : 'var(--text-secondary)',
                                    }}
                                  >
                                    {msgTime}
                                  </span>
                                  {isMe && isEditable(msg.createdAt) && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(msg)}
                                      title="Edit message (allowed within 1 hour of sending)"
                                      style={{
                                        background: isLight ? '#fde68a' : 'rgba(212, 160, 23, 0.15)',
                                        border: isLight ? '1px solid #fcd34d' : '1px solid rgba(212, 160, 23, 0.3)',
                                        color: isLight ? '#78350f' : '#fef08a',
                                        cursor: 'pointer',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        marginLeft: '4px',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <Pencil size={9} />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ATTACHED PRODUCTION PREVIEW CHIP */}
                {attachedProd && (
                  <div
                    style={{
                      padding: '4px 12px',
                      background: isLight ? '#fffbeb' : 'rgba(212, 160, 23, 0.15)',
                      borderTop: isLight ? '1px solid #fde68a' : '1px solid rgba(212, 160, 23, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isLight ? '#92400e' : 'var(--jns-gold)' }}>
                      <Film size={12} />
                      <span>Attaching: <strong>{attachedProd.title}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedProd(null)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* ATTACH PRODUCTION DROPDOWN */}
                {showAttachMenu && (
                  <div
                    style={{
                      padding: '8px',
                      background: isLight ? '#ffffff' : '#1e293b',
                      borderTop: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-color, #334155)',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: isLight ? '0 -4px 12px rgba(0, 0, 0, 0.05)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                      Select Active Production to Link:
                    </div>
                    {availableProductions.map((p) => (
                      <button
                        key={`attach-${p.id}`}
                        type="button"
                        onClick={() => {
                          setAttachedProd({ id: p.id, title: p.title });
                          setShowAttachMenu(false);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '5px',
                          background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
                          border: isLight ? '1px solid #e2e8f0' : '1px solid transparent',
                          color: 'var(--text-main)',
                          fontSize: '11px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </span>
                        <span style={{ fontSize: '9.5px', color: 'var(--jns-gold)', marginLeft: '6px' }}>
                          {p.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* CHAT INPUT FORM */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '8px 10px',
                    background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                    borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    style={{
                      background: attachedProd
                        ? (isLight ? '#fef3c7' : 'rgba(212, 160, 23, 0.2)')
                        : 'transparent',
                      border: 'none',
                      color: attachedProd ? 'var(--jns-gold)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Attach a production reference"
                  >
                    <Paperclip size={15} />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeTab === 'TEAM'
                        ? 'Message #general-team...'
                        : `Message ${selectedRecipient?.name || 'team member'}...`
                    }
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: '20px',
                      background: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.7)',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid var(--border-color, #475569)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    style={{
                      background: inputText.trim()
                        ? 'var(--jns-gold)'
                        : (isLight ? '#e2e8f0' : 'rgba(212, 160, 23, 0.2)'),
                      border: 'none',
                      color: inputText.trim()
                        ? '#000'
                        : (isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.3)'),
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputText.trim() ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    title="Send message"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
