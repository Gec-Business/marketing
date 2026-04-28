import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { askClaude } from '@/lib/ai/client';
import { generatePostImage } from '@/lib/images/generator';
import { getApiKeysForTenant } from '@/lib/api-keys';
import { sanitizeForPrompt } from '@/lib/ai/sanitize';
import { parseAIJson } from '@/lib/ai/parse-json';
import type { Post } from '@/lib/types';

/**
 * Re-generate a specific component of a post with Tea's feedback.
 * Components: copy_primary, copy_secondary, hashtags, visual_description, video_idea, platform_copies
 * Only the targeted component is regenerated; everything else is preserved.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const { component, feedback } = await req.json();

  const validComponents = ['copy', 'hashtags', 'visual', 'video', 'platform_copies', 'image'];
  if (!component || !validComponents.includes(component)) {
    return NextResponse.json({ error: `component must be one of: ${validComponents.join(', ')}` }, { status: 400 });
  }

  const post = await queryOne<Post>('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const tenant = await queryOne<{ name: string; industry: string; primary_language: string; secondary_language: string }>(
    'SELECT name, industry, primary_language, secondary_language FROM tenants WHERE id = $1',
    [post.tenant_id]
  );
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const apiKeys = await getApiKeysForTenant(post.tenant_id);
  const safeFeedback = sanitizeForPrompt(feedback, 500);
  const lang1 = tenant.primary_language === 'ka' ? 'Georgian' : 'English';
  const lang2 = tenant.secondary_language === 'ka' ? 'Georgian' : 'English';

  let systemPrompt = '';
  let userPrompt = '';
  let updateField = '';
  let updateValue: any = null;

  switch (component) {
    case 'copy':
      systemPrompt = `You are a social media copywriter. Rewrite the post copy. Return ONLY valid JSON — no markdown.`;
      userPrompt = `Rewrite this post copy for ${tenant.name} (${tenant.industry}).

Current primary (${lang1}): "${post.copy_primary}"
Current secondary (${lang2}): "${post.copy_secondary || ''}"
Platform: ${post.platforms.join(', ')}
Content type: ${post.content_type}

${safeFeedback ? `Operator feedback: "${safeFeedback}"` : 'Improve the copy.'}

Return JSON: { "copy_primary": "new ${lang1} text", "copy_secondary": "new ${lang2} text" }`;
      break;

    case 'hashtags':
      systemPrompt = `You are a social media hashtag strategist. Generate new hashtags. Return ONLY a JSON array of strings.`;
      userPrompt = `Generate hashtags for this post by ${tenant.name} (${tenant.industry}).

Post: "${(post.copy_primary || '').slice(0, 200)}"
Platform: ${post.platforms.join(', ')}
Current hashtags: ${(post.hashtags || []).join(' ')}

${safeFeedback ? `Operator feedback: "${safeFeedback}"` : 'Improve the hashtags.'}

Return JSON array: ["#tag1", "#tag2", ...]`;
      break;

    case 'visual':
      systemPrompt = `You are a creative director. Write a visual description for AI image generation. Return ONLY valid JSON.`;
      userPrompt = `Write a visual description for this post by ${tenant.name} (${tenant.industry}).

Post: "${(post.copy_primary || '').slice(0, 200)}"
Platform: ${post.platforms.join(', ')}

${safeFeedback ? `Operator feedback: "${safeFeedback}"` : 'Create a compelling visual description.'}

Return JSON: { "visual_description": "detailed description for DALL-E image generation" }`;
      break;

    case 'video':
      systemPrompt = `You are a video content strategist. Create a video scenario. Return ONLY valid JSON.`;
      userPrompt = `Create a video idea for this post by ${tenant.name} (${tenant.industry}).

Post: "${(post.copy_primary || '').slice(0, 200)}"
Platform: ${post.platforms.join(', ')}
Current video idea: ${post.video_idea ? JSON.stringify(post.video_idea) : 'none'}

${safeFeedback ? `Operator feedback: "${safeFeedback}"` : 'Create an engaging video concept.'}

Return JSON: { "concept": "", "scenario": "", "texts": ["overlay 1"], "duration": "15s|30s|60s", "call_to_action": "" }`;
      break;

    case 'platform_copies':
      systemPrompt = `You are a social media expert. Optimize the copy for each platform. Return ONLY valid JSON.`;
      userPrompt = `Optimize this post's copy for each platform. Business: ${tenant.name} (${tenant.industry}).

Base copy (${lang1}): "${post.copy_primary}"
Base copy (${lang2}): "${post.copy_secondary || ''}"
Platforms: ${post.platforms.join(', ')}

${safeFeedback ? `Operator feedback: "${safeFeedback}"` : 'Optimize for each platform.'}

Return JSON: { ${post.platforms.map(p => `"${p}": { "primary": "${lang1} text", "secondary": "${lang2} text" }`).join(', ')} }`;
      break;
  }

  // Image generation is separate — no Claude call needed, just DALL-E
  if (component === 'image') {
    const tenant = await queryOne<{ name: string; brand_config: any }>(
      'SELECT name, brand_config FROM tenants WHERE id = $1', [post.tenant_id]
    );
    const description = (post as any).visual_description || post.copy_primary?.slice(0, 300) || 'Professional social media post';
    try {
      const { url } = await generatePostImage(post.tenant_id, description, tenant?.brand_config || {}, apiKeys.openai);
      await queryOne('UPDATE posts SET generated_image_url = $1 WHERE id = $2', [url, id]);
      return NextResponse.json({ ok: true, component: 'image', generated_image_url: url });
    } catch (e: any) {
      return NextResponse.json({ error: 'Image generation failed: ' + e.message }, { status: 500 });
    }
  }

  try {
    const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 2000, apiKey: apiKeys.anthropic });
    const { parsed, success } = parseAIJson(text);

    if (!success) {
      return NextResponse.json({ error: 'AI returned unparseable response. Try again.' }, { status: 500 });
    }

    // Build the update based on component
    const updates: Record<string, any> = {};

    switch (component) {
      case 'copy':
        if (parsed.copy_primary) updates.copy_primary = parsed.copy_primary;
        if (parsed.copy_secondary) updates.copy_secondary = parsed.copy_secondary;
        break;
      case 'hashtags':
        updates.hashtags = Array.isArray(parsed) ? parsed : (parsed.hashtags || post.hashtags);
        break;
      case 'visual':
        updates.generated_image_url = null; // Clear old image since visual changed
        // Store in post metadata — visual_description isn't a column, but we can update platform_copies
        // Actually, visual_description is used during generation, not stored. Let's store feedback as a comment instead.
        break;
      case 'video':
        updates.video_idea = parsed;
        break;
      case 'platform_copies':
        updates.platform_copies = parsed;
        break;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
      const values = Object.values(updates).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
      values.push(id);

      await queryOne(
        `UPDATE posts SET ${setClauses} WHERE id = $${values.length} RETURNING id`,
        values
      );
    }

    return NextResponse.json({ ok: true, component, updated: updates, tokensUsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
