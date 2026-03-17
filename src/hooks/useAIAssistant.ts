import { useState, useCallback } from 'react';
import { decrypt } from '../utils/crypto';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type PendingCreation =
  | { type: 'todo_list'; title: string; items: string[] }
  | { type: 'prompt'; title: string; content: string; promptTitle: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a restricted AI assistant built into TaskFlow, a personal task management app.
You must ALWAYS respond with valid JSON only — no markdown, no code fences, no extra text.

You can only perform two actions:
1. Generate a to-do list for a project or goal the user describes.
2. Generate a reusable prompt template based on what the user describes.

For a to-do list respond with exactly:
{"type":"todo_list","title":"<concise project name, 2-5 words>","items":["task 1","task 2","task 3"],"message":"<one sentence confirming what was created>"}

For a prompt respond with exactly:
{"type":"prompt","title":"<prompt group name, 2-5 words>","promptTitle":"<prompt entry name, 2-5 words>","content":"<the full reusable prompt text>","message":"<one sentence confirming what was created>"}

For any other request respond with exactly:
{"type":"refusal","message":"I can only help with generating a to-do list or a prompt. Please ask me one of those two things."}

Rules:
- todo_list items: 5-10 clear, actionable tasks (strings only, no numbering)
- prompt content: a complete, reusable instruction template
- ALWAYS return valid JSON. Nothing outside the JSON object.`;

function friendlyError(status: number): string {
  if (status === 429) return 'Rate limit reached. Please wait a moment and try again.';
  if (status === 401 || status === 403) return 'Invalid or unauthorized API key. Check your .env file.';
  if (status === 400) return 'The request was rejected. Try rephrasing your message.';
  if (status === 503 || status === 502) return 'The AI service is temporarily unavailable. Please try again in a moment.';
  if (!navigator.onLine) return 'No internet connection. Check your network and try again.';
  return `Unexpected error (${status}). Please try again.`;
}

function parseAIResponse(raw: string): { displayMessage: string; creation: PendingCreation | null } {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const json = JSON.parse(cleaned);

    if (json.type === 'todo_list' && json.title && Array.isArray(json.items) && json.items.length > 0) {
      return {
        displayMessage: json.message ?? `To-do list "${json.title}" created.`,
        creation: { type: 'todo_list', title: json.title, items: json.items },
      };
    }

    if (json.type === 'prompt' && json.title && json.content) {
      return {
        displayMessage: json.message ?? `Prompt "${json.title}" created.`,
        creation: {
          type: 'prompt',
          title: json.title,
          promptTitle: json.promptTitle ?? json.title,
          content: json.content,
        },
      };
    }

    if (json.type === 'refusal' && json.message) {
      return { displayMessage: json.message, creation: null };
    }
  } catch {
    // Not valid JSON — show raw response as plain text
  }
  return { displayMessage: raw, creation: null };
}

async function callGroq(
  apiKey: string,
  messages: ChatMessage[],
  userText: string,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
    signal,
  });
  if (!res.ok) throw Object.assign(new Error('groq'), { status: res.status });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCreation, setPendingCreation] = useState<PendingCreation | null>(null);

  const sendMessage = useCallback(
    async (userText: string, _contextInfo: string) => {
      // 1. Try runtime environment variable (.env next to EXE)
      let groqKey = (typeof process !== 'undefined' && process.env.VITE_GROQ_API_KEY) || '';

      // 2. Fallback to build-time encrypted key (defined via Vite)
      if (!groqKey && typeof __GROQ_API_KEY__ !== 'undefined' && __GROQ_API_KEY__) {
        groqKey = decrypt(__GROQ_API_KEY__);
      }

      if (!groqKey || groqKey === 'your_groq_api_key_here') {
        setError('No API key configured. Add VITE_GROQ_API_KEY to your .env file and restart the app.');
        return;
      }

      setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: userText }]);
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const raw = await callGroq(groqKey, messages, userText, controller.signal);
        const { displayMessage, creation } = parseAIResponse(raw);
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: displayMessage }]);
        if (creation) setPendingCreation(creation);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setError('Request timed out after 30 seconds. Please try again.');
        } else {
          setError(friendlyError(err?.status ?? 0));
        }
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingCreation(null);
  }, []);

  const clearPendingCreation = useCallback(() => setPendingCreation(null), []);

  return { messages, isLoading, error, pendingCreation, clearPendingCreation, sendMessage, clearHistory };
}
