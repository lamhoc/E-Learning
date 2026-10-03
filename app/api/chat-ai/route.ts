import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const input = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Invalid messages.' }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const item of input) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('role' in item) ||
      !('content' in item) ||
      (item.role !== 'user' && item.role !== 'assistant') ||
      typeof item.content !== 'string' ||
      item.content.trim().length === 0 ||
      item.content.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json({ error: 'Invalid message format.' }, { status: 400 });
    }

    messages.push({ role: item.role, content: item.content.trim() });
  }

  if (messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'The latest message must be from the user.' }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            'Bạn là gia sư AI cho hệ thống E-Learning. Giải thích rõ ràng bằng tiếng Việt, khuyến khích người học tự suy luận. Nếu thiếu ngữ cảnh hoặc không chắc chắn, hãy nói rõ thay vì bịa thông tin.',
        },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 502 });
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    console.error('Groq request failed:', error);
    return NextResponse.json({ error: 'Could not get an AI response.' }, { status: 502 });
  }
}
