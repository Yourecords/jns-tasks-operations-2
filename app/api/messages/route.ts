import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { ChatMessage } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channelType = searchParams.get('channelType') as 'TEAM' | 'DIRECT' | null;
  const recipientId = searchParams.get('recipientId');

  const db = await getDbAsync();
  const allMessages = db.chatMessages || [];

  // Calculate unread counts
  let teamUnreadCount = 0;
  const dmUnreadCounts: Record<string, number> = {};

  allMessages.forEach((m) => {
    const isRead = m.readBy?.includes(user.id) || m.senderId === user.id;
    if (!isRead) {
      if (m.channelType === 'TEAM') {
        teamUnreadCount++;
      } else if (m.channelType === 'DIRECT' && m.recipientId === user.id) {
        dmUnreadCounts[m.senderId] = (dmUnreadCounts[m.senderId] || 0) + 1;
      }
    }
  });

  const totalUnreadCount =
    teamUnreadCount + Object.values(dmUnreadCounts).reduce((acc, c) => acc + c, 0);

  // Filter messages based on request
  let messages: ChatMessage[] = [];

  if (channelType === 'TEAM') {
    messages = allMessages.filter((m) => m.channelType === 'TEAM');
  } else if (channelType === 'DIRECT' && recipientId) {
    messages = allMessages.filter(
      (m) =>
        m.channelType === 'DIRECT' &&
        ((m.senderId === user.id && m.recipientId === recipientId) ||
          (m.senderId === recipientId && m.recipientId === user.id))
    );
  } else {
    // Return all messages the user has access to
    messages = allMessages.filter(
      (m) =>
        m.channelType === 'TEAM' ||
        m.senderId === user.id ||
        m.recipientId === user.id
    );
  }

  // Sort chronologically (oldest first for chat log flow)
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return NextResponse.json({
    messages,
    teamUnreadCount,
    dmUnreadCounts,
    totalUnreadCount,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { channelType, recipientId, content, productionId, productionTitle } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    if (channelType === 'DIRECT' && (!recipientId || recipientId === user.id)) {
      return NextResponse.json({ error: 'Valid recipient required for direct message' }, { status: 400 });
    }

    const db = await getDbAsync();
    if (!db.chatMessages) {
      db.chatMessages = [];
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      channelType: channelType === 'DIRECT' ? 'DIRECT' : 'TEAM',
      recipientId: channelType === 'DIRECT' ? recipientId : undefined,
      content: content.trim(),
      productionId: productionId || undefined,
      productionTitle: productionTitle || undefined,
      createdAt: new Date().toISOString(),
      readBy: [user.id],
    };

    db.chatMessages.push(newMsg);

    // If direct message, trigger an in-app notification for the recipient
    if (channelType === 'DIRECT' && recipientId) {
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: `notif_msg_${Date.now()}`,
        userId: recipientId,
        title: `Message from ${user.name}`,
        message:
          content.trim().length > 60
            ? `${content.trim().substring(0, 57)}...`
            : content.trim(),
        linkUrl: '#chat',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    await saveDbAsync(db);

    return NextResponse.json({ success: true, message: newMsg }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messageId, content, channelType } = body;
    const targetOtherUserId = body.recipientId || body.senderId || body.otherUserId;

    const db = await getDbAsync();
    if (!db.chatMessages) {
      db.chatMessages = [];
    }

    // CASE 1: EDIT MESSAGE
    if (messageId && content !== undefined) {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
      }

      const targetMsg = db.chatMessages.find((m) => m.id === messageId);
      if (!targetMsg) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Must be original sender
      if (targetMsg.senderId !== user.id) {
        return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
      }

      // Check 1 hour (3,600,000 ms) window
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const sentTime = new Date(targetMsg.createdAt).getTime();
      const elapsed = Date.now() - sentTime;

      if (elapsed > ONE_HOUR_MS) {
        return NextResponse.json(
          { error: 'Messages can only be edited within 1 hour after being sent.' },
          { status: 403 }
        );
      }

      targetMsg.content = content.trim();
      targetMsg.isEdited = true;
      targetMsg.editedAt = new Date().toISOString();

      await saveDbAsync(db);
      return NextResponse.json({ success: true, message: targetMsg });
    }

    // CASE 2: MARK CONVERSATION AS READ
    let updated = false;

    db.chatMessages.forEach((m) => {
      let isTarget = false;
      if (channelType === 'TEAM' && m.channelType === 'TEAM') {
        isTarget = true;
      } else if (
        channelType === 'DIRECT' &&
        m.channelType === 'DIRECT' &&
        m.senderId === targetOtherUserId &&
        m.recipientId === user.id
      ) {
        isTarget = true;
      }

      if (isTarget) {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(user.id)) {
          m.readBy.push(user.id);
          updated = true;
        }
      }
    });

    if (updated) {
      await saveDbAsync(db);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process update' }, { status: 500 });
  }
}
