import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { generateContentBatch } from '@/lib/ai/content-generator';
import { getApiKeysForTenant } from '@/lib/api-keys';
import { v4 as uuid } from 'uuid';
import type { Tenant, Assessment } from '@/lib/types';

/**
 * Re-generate the entire content batch for a tenant with Tea's content direction.
 * Deletes all existing draft posts and generates a fresh batch with Tea's feedback
 * injected into the AI prompt.
 */
export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id, count, week_start, direction, delete_drafts } = await req.json();

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const assessment = await queryOne<Assessment>(
    'SELECT * FROM assessments WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
    [tenant_id, 'approved']
  );
  if (!assessment) {
    return NextResponse.json({ error: 'No approved assessment found.' }, { status: 400 });
  }

  // Delete existing draft posts if requested
  if (delete_drafts !== false) {
    const deleted = await query(
      `DELETE FROM posts WHERE tenant_id = $1 AND status = 'draft' RETURNING id`,
      [tenant_id]
    );
    console.log(`Deleted ${deleted.length} draft posts for tenant ${tenant_id}`);
  }

  // Inject Tea's content direction into the tenant description temporarily
  const enrichedTenant = direction
    ? { ...tenant, description: `${tenant.description || ''}\n\nContent direction from operator: ${direction}` }
    : tenant;

  const apiKeys = await getApiKeysForTenant(tenant_id);
  const safeCount = Math.min(Math.max(count || tenant.posts_per_week, 1), 30);

  const { posts: generated, tokensUsed } = await generateContentBatch(
    enrichedTenant, assessment, safeCount, week_start || new Date().toISOString().split('T')[0],
    apiKeys.anthropic
  );

  if (generated.length === 0) {
    return NextResponse.json({ error: 'Content generation returned no posts. Try again.' }, { status: 500 });
  }

  const batchId = uuid();
  const createdPosts = [];

  for (const post of generated) {
    const created = await queryOne(
      `INSERT INTO posts (tenant_id, content_type, platforms, copy_primary, copy_secondary, platform_copies, hashtags, media_urls, video_idea, generated_image_url, scheduled_at, batch_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        tenant_id,
        post.content_type || 'image_post',
        post.platforms || tenant.channels,
        post.copy_primary,
        post.copy_secondary,
        JSON.stringify(post.platform_copies || {}),
        post.hashtags || [],
        [],
        post.video_idea ? JSON.stringify(post.video_idea) : null,
        null,
        post.suggested_date || null,
        batchId,
        post.sort_order || 0,
      ]
    );
    createdPosts.push(created);
  }

  // Cost tracking
  const estInputTokens = Math.round(tokensUsed * 0.3);
  const estOutputTokens = tokensUsed - estInputTokens;
  const totalCost = (estInputTokens / 1_000_000) * 3 + (estOutputTokens / 1_000_000) * 15;
  const billedTo = apiKeys.source.anthropic === 'tenant' ? 'tenant' : apiKeys.source.anthropic === 'operator' ? 'operator' : 'gec';

  await query(
    `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used, billed_to) VALUES ($1, 'ai_content', $2, $3, $4, $5)`,
    [tenant_id, `Re-generated ${generated.length} posts (batch)`, totalCost, tokensUsed, billedTo]
  );

  return NextResponse.json({ posts: createdPosts, batchId, tokensUsed, count: createdPosts.length });
}
