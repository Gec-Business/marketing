import Anthropic from '@anthropic-ai/sdk';

let globalClient: Anthropic | null = null;

export function getClaudeClient(apiKey?: string): Anthropic {
  if (apiKey) {
    return new Anthropic({ apiKey });
  }
  if (!globalClient) {
    globalClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return globalClient;
}

export async function askClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; apiKey?: string }
): Promise<{ text: string; tokensUsed: number; inputTokens: number; outputTokens: number }> {
  const claude = getClaudeClient(options?.apiKey);
  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const tokensUsed = inputTokens + outputTokens;
    return { text, tokensUsed, inputTokens, outputTokens };
  } catch (error: any) {
    console.error('Claude API error:', error?.message || error);
    throw new Error(`AI service error: ${error?.message || 'Unknown error'}`);
  }
}
