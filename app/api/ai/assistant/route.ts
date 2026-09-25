import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getDbAsync } from '@/lib/db';
import { Production, User } from '@/lib/types';

export const runtime = 'nodejs';

// System prompt codifying JNS Video Production daily operations, stages, roles, and rules
const JNS_SYSTEM_PROMPT = `
You are the dedicated JNS Video Production & Task Management AI Assistant.
Your sole purpose is to help producers, editors, and team members use this platform efficiently, accurately, and according to official JNS standard operating procedures (SOP).

=== JNS VIDEO PRODUCTION 8-STAGE WORKFLOW ===
1. STAGE 1: Topic & Research
   - Researching episode topics, guest background, and talking points.
2. STAGE 2: Filming / Studio Recording
   - In Studio, Studio + Remote Guest, or Fully Remote recordings.
   - Studio Conflict Rule: The JNS Jerusalem Studio cannot hold two In-Studio recordings at the same time. Simultaneous Fully Remote recordings are allowed.
3. STAGE 3: Editing / Post-Production
   - Editor takes assigned task from To Do to In Progress.
   - Editor edits Draft 1 (H.264 MP4/WebM or master ProRes on Google Drive/Dropbox).
4. STAGE 4: Internal Producer Review
   - Producer reviews Draft 1.
   - If changes are needed, Producer requests a Revision with revision notes, automatically generating Draft 2.
5. STAGE 5: Executive / Final Producer Approval
   - ONLY a Producer or Admin can grant Final Producer Approval. Editors CANNOT approve their own work.
6. STAGE 6: Graphics & Packaging
   - Graphic design tasks: Thumbnails, lower thirds, banners. Quick Action (1-day turnaround) or 8-stage long-term projects.
7. STAGE 7: Final Upload & Quality Check
   - Final clean upload to Drive/YouTube. Cannot be completed before explicit Final Approval.
8. STAGE 8: Completed / Published
   - Episode is officially finished, verified by Producer, and archived.

=== USER ROLES & ACCESS MATRIX ===
- ADMIN: Full system access, perspective switching ("View-As"), deleting albums/media, managing gear inventory, Gett Business Israel taxi connections.
- PRODUCER: Create shows, episodes, and pilots; assign editors; approve revisions and grant Final Producer Approval; schedule filming.
- EDITOR: Edit assigned tasks, transition tasks to In Progress, submit drafts for review. Cannot give Final Producer Approval.
- TEAM_MEMBER: Submit show ideas, submit gear checkout requests, submit problem reports (anonymous or attributed), view assigned tasks.

=== MEDIA & ALBUMS ===
- Unlimited media items per album.
- Max file size: 25 MB to 100 MB depending on storage config.
- Video files (MP4, MOV, WebM) automatically have high-quality thumbnails generated past opening black frames.

=== GETT TAXI DISPATCH ===
- Connected to Gett Business Israel (Gett Business IL). Used for VIP guest transportation to the JNS Jerusalem studio.

=== YOUR BEHAVIOR & STYLE ===
- Keep answers professional, concise, direct, and actionable.
- Format responses using GitHub-flavored markdown: bold headers, bullet points, and clickable markdown links to productions (e.g. [Episode Title](/productions/{id})).
- Always use the provided tools to fetch real-time information when the user asks about their tasks, filming schedule, specific shows, or gear.
- If a user asks for something beyond their role's authority (e.g. an editor asking to approve an episode), explain the rule politely and guide them on the proper workflow.
`;

// Tool definitions for OpenAI Function Calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_my_active_tasks',
      description: "Get the currently logged-in user's active productions and editing tasks.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_filming_schedule',
      description: 'Get upcoming filming dates, studio hours, and recording formats (In Studio vs Remote).',
      parameters: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', description: 'Number of days ahead to search (default 7)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_productions',
      description: 'Search for productions or episodes by title, show name, or stage.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term for show name, episode title, or topic' },
          stage: { type: 'number', description: 'Optional workflow stage number (1 to 8)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_gear_status',
      description: 'Check gear inventory availability and active checkout status.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional category (CAMERA, AUDIO, LIGHTING, ACCESSORY)' },
        },
      },
    },
  },
];

// Fallback rule-based responses if OPENAI_API_KEY is not configured yet
function generateSmartFallback(query: string, user: User, db: any) {
  const q = query.toLowerCase();

  if (q.includes('task') || q.includes('assigned to me') || q.includes('my task')) {
    const myProds = db.productions.filter(
      (p: Production) =>
        p.editorId === user.id ||
        p.producerId === user.id ||
        p.tasks?.some((t) => t.assignedUserId === user.id && t.status !== 'COMPLETED'),
    );
    if (!myProds.length) {
      return `### Your Active Tasks\nYou currently have **0 active tasks** assigned to you.\n\nTo view all productions, check out the [Productions Page](/productions).`;
    }
    const list = myProds
      .slice(0, 6)
      .map(
        (p: Production) =>
          `- **[${p.title || 'Untitled Episode'}](/productions/${p.id})** — Stage: \`${p.currentStage || 'RESEARCH'}\` (${p.status || 'Active'}) | Due: ${p.editingDeadline || p.publicationDeadline || 'No deadline'}`,
      )
      .join('\n');
    return `### Your Active Tasks (${myProds.length} total)\nHere are your current assignments:\n\n${list}\n\n*Note: To enable conversational live AI reasoning, configure \`OPENAI_API_KEY\` in your environment.*`;
  }

  if (q.includes('film') || q.includes('studio') || q.includes('schedule')) {
    const filming = db.productions
      .filter((p: Production) => p.filmingDate && (p.currentStage === 'FILMING' || p.currentStage === 'RENTAL_SCHEDULED'))
      .slice(0, 5);
    if (!filming.length) {
      return `### Filming Schedule\nThere are no upcoming shoots scheduled in the immediate queue. Check the [Production Calendar](/calendar) for full month and week views.`;
    }
    const list = filming
      .map(
        (p: Production) =>
          `- **[${p.title}](/productions/${p.id})** — Date: \`${p.filmingDate}\` at \`${p.filmingTime || 'TBD'}\` | Format: **${p.recordingType || p.location || 'In Studio'}**`,
      )
      .join('\n');
    return `### Upcoming Filming Schedule\n\n${list}\n\nView and manage shifts on the [Production Calendar](/calendar).`;
  }

  if (q.includes('revision') || q.includes('draft 2') || q.includes('approval')) {
    return `### JNS Revision & Approval Workflow
1. **Draft 1 Submission**: The editor uploads the cut (Stage 3).
2. **Producer Review (Stage 4)**: The Producer reviews the cut.
3. **Request Revision**: If adjustments are required, the Producer marks *Revision Required* with specific timestamped notes. This generates **Draft 2**.
4. **Final Approval (Stage 5)**: Only a **Producer** or **Admin** can approve the final draft. Editors cannot approve their own work.
5. **Stage 7 & 8**: The final approved asset is published and marked Completed.`;
  }

  if (q.includes('taxi') || q.includes('gett') || q.includes('ride')) {
    return `### Gett Business Israel Taxi Dispatch
- **Where**: Open any production in Stage 2 or go to the [Taxis Dispatch Hub](/taxis).
- **How**: Enter the guest's pickup address, time, and phone number.
- **Billing**: Rides are automatically charged to the corporate JNS Gett Business IL account.`;
  }

  if (q.includes('gear') || q.includes('camera') || q.includes('mic') || q.includes('equipment')) {
    return `### Gear Inventory & Rentals
- Check out cameras, lighting, and audio equipment in the [Gear Inventory Hub](/gear-log).
- For specialized external gear rentals, submit an equipment request in the [Rentals Section](/rentals).
- Billing handoffs are automatically sent to Finance upon checkout completion.`;
  }

  return `### JNS Video Operations Assistant
I am ready to help you navigate and manage your daily production workflow.

**Quick Things You Can Ask Me:**
- 📋 *"Show my active tasks"*
- 🎬 *"What filming is scheduled this week?"*
- 🔄 *"How does the revision process work?"*
- 🚕 *"How do I book a taxi for a studio guest?"*
- 📹 *"Check camera inventory status"*

*(Tip: For full live AI conversational responses, add \`OPENAI_API_KEY\` to your \`.env\` file).*`;
}

// Tool executor
async function executeTool(name: string, args: any, user: User) {
  const db = await getDbAsync();

  if (name === 'get_my_active_tasks') {
    const myProds = db.productions.filter(
      (p) =>
        p.editorId === user.id ||
        p.producerId === user.id ||
        p.tasks?.some((t) => t.assignedUserId === user.id && t.status !== 'COMPLETED'),
    );
    return {
      count: myProds.length,
      tasks: myProds.slice(0, 10).map((p) => ({
        id: p.id,
        title: p.title,
        showId: p.showId,
        stage: p.currentStage,
        status: p.status,
        filmingDate: p.filmingDate,
        dueDate: p.editingDeadline || p.publicationDeadline,
        isEditor: p.editorId === user.id,
        isProducer: p.producerId === user.id,
      })),
    };
  }

  if (name === 'get_filming_schedule') {
    const scheduled = db.productions
      .filter((p) => Boolean(p.filmingDate))
      .sort((a, b) => (a.filmingDate || '').localeCompare(b.filmingDate || ''))
      .slice(0, 8);
    return {
      scheduled: scheduled.map((p) => ({
        id: p.id,
        title: p.title,
        date: p.filmingDate,
        time: p.filmingTime,
        format: p.recordingType || p.location,
        stage: p.currentStage,
      })),
    };
  }

  if (name === 'search_productions') {
    const term = (args.query || '').toLowerCase();
    const matches = db.productions.filter((p) => {
      const titleMatch = (p.title || '').toLowerCase().includes(term);
      const stageMatch = args.stage ? p.currentStage === args.stage : true;
      return titleMatch && stageMatch;
    });
    return {
      totalFound: matches.length,
      results: matches.slice(0, 6).map((p) => ({
        id: p.id,
        title: p.title,
        stage: p.currentStage,
        status: p.status,
        filmingDate: p.filmingDate,
      })),
    };
  }

  if (name === 'get_gear_status') {
    const category = args.category;
    const items = db.gearInventory.filter((g) => (!category ? true : g.category === category));
    return {
      totalItems: items.length,
      available: items.filter((g) => g.status === 'AVAILABLE').length,
      checkedOut: items.filter((g) => g.status === 'CHECKED_OUT').length,
      sampleItems: items.slice(0, 8).map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        status: g.status,
      })),
    };
  }

  return { error: `Tool ${name} not recognized.` };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    if (!rawMessages.length) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    const latestUserMessage =
      [...rawMessages].reverse().find((m) => m.role === 'user')?.content || '';

    const apiKey = process.env.OPENAI_API_KEY;

    // If OPENAI_API_KEY is not configured, supply immediate intelligent local guidance
    if (!apiKey) {
      const db = await getDbAsync();
      const fallbackReply = generateSmartFallback(latestUserMessage, user, db);
      return NextResponse.json({
        role: 'assistant',
        content: fallbackReply,
      });
    }

    // Call OpenAI GPT-4o-mini
    const messages = [
      {
        role: 'system',
        content: `${JNS_SYSTEM_PROMPT}\n\nCurrent User: ${user.name} (${user.email}), Role: ${user.role}.`,
      },
      ...rawMessages.map((m: any) => ({
        role: m.role,
        content: m.content || '',
      })),
    ];

    let currentMessages = [...messages];
    let turns = 0;

    // Support tool-calling loop (up to 3 turns)
    while (turns < 3) {
      turns++;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('OpenAI API Error:', errText);
        // Graceful fallback to smart local answers if OpenAI quota/key fails
        const db = await getDbAsync();
        const fallback = generateSmartFallback(latestUserMessage, user, db);
        return NextResponse.json({ role: 'assistant', content: fallback });
      }

      const completion = await response.json();
      const choice = completion.choices?.[0];
      if (!choice) {
        throw new Error('No completion choice returned from OpenAI.');
      }

      const message = choice.message;

      // Check if tool calls were requested
      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message);

        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch {}

          const toolResult = await executeTool(fnName, fnArgs, user);
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          } as any);
        }
      } else {
        // Final text answer ready
        return NextResponse.json({
          role: 'assistant',
          content: message.content || 'I am here to assist with JNS Video Operations.',
        });
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: 'Could not complete the query in time. Please try rephrasing your question.',
    });
  } catch (error: any) {
    console.error('AI Assistant Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
