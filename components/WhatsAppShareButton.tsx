'use client';

import React from 'react';

interface WhatsAppShareButtonProps {
  message?: string;
  recipientName?: string;
  itemTitle?: string;
  stageOrAction?: string;
  directLink?: string;
  customText?: string;
  phoneNumber?: string;
  buttonLabel?: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'icon-only';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export default function WhatsAppShareButton({
  message,
  recipientName,
  itemTitle,
  stageOrAction,
  directLink,
  customText,
  phoneNumber,
  buttonLabel = 'WhatsApp',
  variant = 'solid',
  size = 'sm',
  className = '',
}: WhatsAppShareButtonProps) {
  // Construct pre-filled message if not provided explicitly
  let finalMessage = message;
  if (!finalMessage) {
    const greeting = recipientName ? `Hey ${recipientName}, ` : '';
    const subject = itemTitle ? `*${itemTitle}*` : 'your production item';
    const action = stageOrAction || 'is ready for review';
    const link = directLink ? `\n\nLink: ${directLink}` : '';
    finalMessage = `${greeting}${subject} ${action}.${link}`;
  } else if (customText) {
    finalMessage = customText;
  }

  const encodedMessage = encodeURIComponent(finalMessage);
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  // Styles based on variant
  let baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRadius: '6px',
    lineHeight: 1,
  };

  if (size === 'xs') {
    baseStyle = { ...baseStyle, fontSize: '11px', padding: '4px 8px' };
  } else if (size === 'sm') {
    baseStyle = { ...baseStyle, fontSize: '12px', padding: '6px 11px' };
  } else {
    baseStyle = { ...baseStyle, fontSize: '13px', padding: '8px 14px' };
  }

  if (variant === 'solid') {
    baseStyle = {
      ...baseStyle,
      backgroundColor: '#25D366',
      color: '#062812',
      border: '1px solid #20bd5a',
      boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
    };
  } else if (variant === 'outline') {
    baseStyle = {
      ...baseStyle,
      backgroundColor: 'rgba(37, 211, 102, 0.1)',
      color: '#25D366',
      border: '1px solid rgba(37, 211, 102, 0.35)',
    };
  } else if (variant === 'ghost') {
    baseStyle = {
      ...baseStyle,
      backgroundColor: 'transparent',
      color: '#25D366',
      border: '1px solid transparent',
    };
  } else if (variant === 'icon-only') {
    baseStyle = {
      ...baseStyle,
      padding: '6px',
      backgroundColor: 'rgba(37, 211, 102, 0.15)',
      color: '#25D366',
      border: '1px solid rgba(37, 211, 102, 0.3)',
      borderRadius: '50%',
    };
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={baseStyle}
      className={`whatsapp-share-btn ${className}`}
      title="Share formatted update on WhatsApp (Web or App)"
      onClick={(e) => {
        // Prevent triggering parent row click/expand events
        e.stopPropagation();
      }}
    >
      <svg
        width={size === 'xs' ? '12' : size === 'sm' ? '14' : '16'}
        height={size === 'xs' ? '12' : size === 'sm' ? '14' : '16'}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-2.127-.521-1.615-.67-2.66-2.316-2.741-2.425-.08-.109-.652-.868-.652-1.652 0-.784.41-1.17.556-1.332.146-.162.319-.203.426-.203.107 0 .213.001.306.006.098.005.23-.037.36.275.133.32.454 1.106.494 1.187.04.081.067.175.014.282-.054.107-.08.175-.16.27-.08.094-.17.21-.242.282-.081.081-.166.17-.071.333.094.162.421.694.904 1.124.622.553 1.146.724 1.308.805.162.081.257.068.352-.04.095-.108.405-.472.513-.634.108-.162.216-.135.364-.081.148.054.945.446 1.107.527.162.081.27.121.31.189.04.068.04.392-.104.797z" />
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.402C8.423 21.498 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.273c-1.644 0-3.187-.492-4.48-1.336l-.321-.208-2.96.833.847-2.894-.225-.337A8.225 8.225 0 0 1 3.727 12c0-4.562 3.711-8.273 8.273-8.273 4.562 0 8.273 3.711 8.273 8.273 0 4.562-3.711 8.273-8.273 8.273z" />
      </svg>
      {variant !== 'icon-only' && <span>{buttonLabel}</span>}
    </a>
  );
}
