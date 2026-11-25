import { POST as handleChatAiPost } from '../chat-ai/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleChatAiPost(request);
}
