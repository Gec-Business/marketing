import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, requireUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { generateContentBatch } from '@/lib/ai/content-generator';
import { generatePostImage } from '@/lib/images/generator';
import { getApiKeysForTenant } from '@/lib/api-keys';
import { v4 as uuid } from 'uuid';
import type { Tenant, Assessment } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  const status = req.nextUrl.searchParams.get('status');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10) || 100, 200);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0, 0);

  let sql = 'SELECT * FROM posts WHERE 1=1';
  const params: unknown[] = [];
  let idx = 1;

  if (user.role === 'tenant') {
    sql += ` AND tenant_id = $${idx}`;
    params.push(user.tenant_id);
    idx++;
    sql += ` AND status NOT IN ('draft')`;
  } else if (tenantId) {
    sql += ` AND tenant_id = $${idx}`;
    params.push(tenantId);
    idx++;
  }

  if (status) {
    sql += ` AND status = $${idx}`;
    params.push(status);
    idx++;
  }

  sql += ` ORDER BY scheduled_at ASC NULLS LAST, sort_order ASC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);

  const posts = await query(sql, params);
  return NextResponse.json({ posts, limit, offset });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id, count, week_start, generate_images } = await req.json();

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const assessment = await queryOne<Assessment>(
    'SELECT * FROM assessments WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
    [tenant_id, 'approved']
  );
  if (!assessment) return NextResponse.json({ error: 'No approved assessment found. Run and approve an assessment first.' }, { status: 400 });

  const safeCount = Math.min(Math.max(count || tenant.posts_per_week, 1), 30);
  const apiKeys = await getApiKeysForTenant(tenant_id);
  const { posts: generated, tokensUsed } = await generateContentBatch(tenant, assessment, safeCount, week_start, apiKeys.anthropic);

  if (generated.length === 0) {
    return NextResponse.json({ error: 'Content generation returned no posts' }, { status: 500 });
  }

  const batchId = uuid();
  const createdPosts = [];
  let imagesGenerated = 0;

  for (const post of generated) {
    let generatedImageUrl = null;
    if (generate_images && post.visual_description && post.content_type === 'image_post') {
      if (!apiKeys.openai) {
        console.warn('Skipping image generation: no OpenAI API key configured (tenant/operator/global all empty)');
      } else {
        try {
          const { url } = await generatePostImage(tenant_id, post.visual_description, tenant.brand_config, apiKeys.openai);
          generatedImageUrl = url;
          imagesGenerated++;
        } catch (e) {
          console.error('Image generation failed:', e);
        }
      }
    }

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
        generatedImageUrl ? [generatedImageUrl] : [],
        post.video_idea ? JSON.stringify(post.video_idea) : null,
        generatedImageUrl,
        post.suggested_date || null,
        batchId,
        post.sort_order || 0,
      ]
    );
    createdPosts.push(created);
  }

  // Claude Sonnet 4.6 pricing: $3/1M input, $15/1M output
  const estInputTokens = Math.round(tokensUsed * 0.3);
  const estOutputTokens = tokensUsed - estInputTokens;
  const claudeCost = (estInputTokens / 1_000_000) * 3 + (estOutputTokens / 1_000_000) * 15;
  const imageCost = imagesGenerated * 0.04;
  const totalCost = claudeCost + imageCost;
  const billedTo = apiKeys.source.anthropic === 'tenant' ? 'tenant' : apiKeys.source.anthropic === 'operator' ? 'operator' : 'gec';
  await query(
    `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used, billed_to) VALUES ($1, 'ai_content', $2, $3, $4, $5)`,
    [tenant_id, `Generated ${generated.length} posts (${imagesGenerated} images)`, totalCost, tokensUsed, billedTo]
  );

  return NextResponse.json({ posts: createdPosts, batchId, tokensUsed, count: createdPosts.length, imagesGenerated });
}
