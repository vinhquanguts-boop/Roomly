import { Hono } from 'hono';
import { z } from 'zod';
import { getAI } from '../services/ai/index.js';
import { preDesignChatOutputSchema } from '../services/ai/types.js';
import type { DesignBrief, PreDesignChatOutput } from '../services/ai/types.js';

// --- In-memory session store -------------------------------------------------
// Sessions are intentionally transient — they exist only to bridge the pre-design
// chat conversation to the SetupPage. No DB table is needed.

type SessionMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  messages: SessionMessage[];
  createdAt: Date;
};

const sessions = new Map<string, ChatSession>();
const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message content is required.').max(800, 'Messages must be 800 characters or fewer.'),
});

const roomTypePatterns: Array<[DesignBrief['roomType'], RegExp]> = [
  ['living_room', /\b(living room|lounge|family room)\b/i],
  ['bedroom', /\b(master bedroom|bedroom)\b/i],
  ['kitchen', /\bkitchen\b/i],
  ['bathroom', /\b(bathroom|ensuite)\b/i],
  ['office', /\b(home office|office|study)\b/i],
  ['dining', /\b(dining room|dining area|dining)\b/i],
  ['entryway', /\b(entryway|foyer|hallway)\b/i],
];

const stylePhrases = [
  'warm minimalist',
  'coastal boho',
  'dark moody',
  'scandinavian',
  'mid-century',
  'japandi',
  'maximalist',
  'minimalist',
  'modern',
  'industrial',
  'farmhouse',
  'rustic',
  'contemporary',
  'eclectic',
  'boho',
  'coastal',
];

function inferDesignBrief(messages: SessionMessage[]): DesignBrief | null {
  const userNotes = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lowerNotes = userNotes.toLowerCase();

  const roomType = roomTypePatterns.find(([, pattern]) => pattern.test(userNotes))?.[0];
  const budgetMatch =
    lowerNotes.match(/\bbudget(?:\s+of)?\s*\$?(\d{2,5})(?:\s*(?:aud|usd|nzd))?\b/i) ??
    lowerNotes.match(/\b\$?(\d{2,5})\s*(?:aud|usd|nzd)\b/i);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const stylePreference = stylePhrases.find((style) => lowerNotes.includes(style));

  if (!roomType || !budget || !stylePreference) {
    return null;
  }

  const currency = /\busd\b/i.test(userNotes)
    ? 'USD'
    : /\bnzd\b/i.test(userNotes)
      ? 'NZD'
      : 'AUD';
  const deliveryUrgency = /\b(flexible|no rush|not urgent)\b/i.test(userNotes)
    ? 'flexible'
    : /\b(urgent|asap|quickly|within \d+ (day|days|week|weeks))\b/i.test(userNotes)
      ? 'urgent'
      : 'normal';

  return {
    roomType,
    budget,
    currency,
    stylePreference,
    deliveryUrgency,
    userNotes: userNotes.slice(0, 400),
  };
}

// Evict sessions older than 2 hours every 30 minutes
setInterval(
  () => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, session] of sessions) {
      if (session.createdAt.getTime() < cutoff) {
        sessions.delete(id);
      }
    }
  },
  30 * 60 * 1000
);

// --- Router ------------------------------------------------------------------

export const chatRouter = new Hono();

/** POST /api/chat/session — create a new pre-design chat session */
chatRouter.post('/session', (c) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    id: sessionId,
    messages: [],
    createdAt: new Date(),
  });
  return c.json({ sessionId }, 201);
});

/** GET /api/chat/session/:id — fetch message history */
chatRouter.get('/session/:id', (c) => {
  const session = sessions.get(c.req.param('id'));
  if (!session) {
    return c.json({ error: 'Session not found.' }, 404);
  }
  return c.json({ messages: session.messages });
});

/** POST /api/chat/session/:id/message — send a user message and get the AI reply */
chatRouter.post('/session/:id/message', async (c) => {
  const session = sessions.get(c.req.param('id'));
  if (!session) {
    return c.json({ error: 'Session not found.' }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const parsedBody = messageSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json({ error: parsedBody.error.issues[0]?.message ?? 'Invalid message.' }, 400);
  }
  const userContent = parsedBody.data.content;

  // Append user message
  const userMsg: SessionMessage = {
    id: `u-${Date.now()}`,
    role: 'user',
    content: userContent,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(userMsg);

  // Build history slice (everything before this message)
  const history = session.messages
    .slice(0, -1)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Run AI
  let result: PreDesignChatOutput;
  try {
    const ai = getAI();
    const raw = await ai.preDesignChat({ history, userMessage: userContent });
    result = preDesignChatOutputSchema.parse(raw);
  } catch (err) {
    console.error('[chat] preDesignChat error:', err);
    session.messages.pop();
    return c.json(
      { error: 'Roomly could not reach the local AI. Check that Ollama is running, then try again.' },
      503
    );
  }

  if (!result.readyToDesign) {
    const inferredBrief = inferDesignBrief(session.messages);
    if (inferredBrief) {
      result = {
        reply: `Perfect - I have your ${inferredBrief.stylePreference} ${inferredBrief.roomType.replace('_', ' ')} direction and ${inferredBrief.currency} $${inferredBrief.budget} budget. Let's start designing.`,
        readyToDesign: true,
        brief: inferredBrief,
      };
    }
  }

  // Append assistant reply
  const assistantMsg: SessionMessage = {
    id: `a-${Date.now()}`,
    role: 'assistant',
    content: result.reply,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(assistantMsg);

  return c.json({
    message: assistantMsg,
    brief: result.brief ?? null,
    readyToDesign: result.readyToDesign,
  });
});
