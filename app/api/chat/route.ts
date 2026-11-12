import { POST as handleChatAiPost } from '../chat-ai/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleChatAiPost(request);
}
