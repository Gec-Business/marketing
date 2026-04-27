/**
 * Integration tests for lib/publishers/engine.ts
 *
 * All DB access is mocked via vi.mock('@/lib/db').
 * fetch is stubbed globally so no real API calls are ever made.
 * The tests exercise real business logic — branching, status transitions,
 * counter increments, SQL patterns — not just that mocks were called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

// ─── Mock platform publishers so publishPost doesn't need real credentials ───
vi.mock('@/lib/publishers/facebook', () => ({
  postToFacebook: vi.fn(),
  postVideoToFacebook: vi.fn(),
}));
vi.mock('@/lib/publishers/instagram', () => ({
  postToInstagram: vi.fn(),
  postReelToInstagram: vi.fn(),
}));
vi.mock('@/lib/publishers/linkedin', () => ({
  postToLinkedIn: vi.fn(),
}));
vi.mock('@/lib/publishers/tiktok', () => ({
  postVideoToTikTok: vi.fn(),
  postPhotoToTikTok: vi.fn(),
}));

import { runAutoPublish, publishPost } from '@/lib/publishers/engine';
import { query, queryOne } from '@/lib/db';
import { postToFacebook } from '@/lib/publishers/facebook';
import { postToInstagram } from '@/lib/publishers/instagram';
import { postToLinkedIn } from '@/lib/publishers/linkedin';

const mockQuery = query as ReturnType<typeof vi.fn>;
const mockQueryOne = queryOne as ReturnType<typeof vi.fn>;
const mockPostToFacebook = postToFacebook as ReturnType<typeof vi.fn>;
const mockPostToInstagram = postToInstagram as ReturnType<typeof vi.fn>;
const mockPostToLinkedIn = postToLinkedIn as ReturnType<typeof vi.fn>;

// Helper: build a minimal post row
function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    tenant_id: 'tenant-1',
    platforms: ['facebook'],
    content_type: 'image_post',
    copy_primary: 'Hello world',
    copy_secondary: null,
    hashtags: [],
    media_urls: [],
    generated_image_url: null,
    platform_copies: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = 'https://example.com';
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-chars!!';
  // Stub fetch globally — checkTokenExpiry uses it for LinkedIn/TikTok refresh
  vi.stubGlobal('fetch', vi.fn());
});

// ─────────────────────────────────────────────────────────────────────────────
describe('runAutoPublish()', () => {
  it('returns {published:0, failed:0, skipped:0} when no scheduled posts', async () => {
    // query() for the UPDATE ... FOR UPDATE SKIP LOCKED returns empty array
    mockQuery.mockResolvedValueOnce([]);

    const result = await runAutoPublish();

    expect(result).toEqual({ published: 0, failed: 0, skipped: 0 });
  });

  it('uses FOR UPDATE SKIP LOCKED in the claim query', async () => {
    mockQuery.mockResolvedValueOnce([]); // no posts

    await runAutoPublish();

    const firstCall = mockQuery.mock.calls[0];
    const sql: string = firstCall[0];
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/i);
  });

  it('skips a post and resets it to "scheduled" when tenant has no active social connections', async () => {
    const post = makePost();
    // 1st query: claim scheduled posts → returns [post]
    mockQuery.mockResolvedValueOnce([post]);
    // 2nd query: social_connections for this tenant → empty (no active connections)
    mockQuery.mockResolvedValueOnce([]);
    // 3rd query: UPDATE posts SET status = 'scheduled' (reset)
    mockQuery.mockResolvedValueOnce([]);

    const result = await runAutoPublish();

    expect(result).toEqual({ published: 0, failed: 0, skipped: 1 });

    // The reset UPDATE must target 'scheduled' status for this post ID
    const resetCall = mockQuery.mock.calls.find(
      ([sql]: [string]) => sql.includes("status = 'scheduled'") && sql.includes('WHERE id =')
    );
    expect(resetCall).toBeDefined();
    expect(resetCall![1]).toContain('post-1');
  });

  it('counts published++ when all platforms succeed', async () => {
    const post = makePost({ platforms: ['facebook'] });

    // Claim query
    mockQuery.mockResolvedValueOnce([post]);
    // social_connections — facebook is connected
    mockQuery.mockResolvedValueOnce([{ platform: 'facebook' }]);

    // Inside publishPost:
    // queryOne: SELECT * FROM posts WHERE id = $1
    mockQueryOne.mockResolvedValueOnce(post);
    // queryOne: UPDATE posts SET status = 'publishing'
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'publishing' });
    // checkTokenExpiry: queryOne for social_connections expires_at
    mockQueryOne.mockResolvedValueOnce(null); // no connection row → skip refresh
    // Final UPDATE status → 'posted'
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'posted' });

    // Facebook publisher returns success
    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-123' });

    const result = await runAutoPublish();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('counts failed++ when publishPost throws', async () => {
    const post = makePost({ platforms: ['facebook'] });

    // Claim query
    mockQuery.mockResolvedValueOnce([post]);
    // social_connections — facebook is connected
    mockQuery.mockResolvedValueOnce([{ platform: 'facebook' }]);

    // publishPost: queryOne for post lookup throws
    mockQueryOne.mockRejectedValueOnce(new Error('DB connection lost'));

    const result = await runAutoPublish();

    expect(result.failed).toBe(1);
    expect(result.published).toBe(0);
  });

  it('counts failed++ when all platforms fail (non-throw partial path)', async () => {
    const post = makePost({ platforms: ['facebook'] });

    // Claim query
    mockQuery.mockResolvedValueOnce([post]);
    // social_connections
    mockQuery.mockResolvedValueOnce([{ platform: 'facebook' }]);

    // publishPost internals
    mockQueryOne.mockResolvedValueOnce(post);                              // SELECT post
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'publishing' }); // UPDATE publishing
    mockQueryOne.mockResolvedValueOnce(null);                              // checkTokenExpiry → no conn
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'failed' });    // final UPDATE

    // Facebook publisher throws a non-transient error
    mockPostToFacebook.mockRejectedValueOnce(new Error('Facebook not connected'));

    const result = await runAutoPublish();

    expect(result.failed).toBe(1);
    expect(result.published).toBe(0);
  });

  it('handles multiple posts: one skipped, one published, one failed', async () => {
    const postSkip = makePost({ id: 'post-skip', platforms: ['instagram'] });
    const postOk   = makePost({ id: 'post-ok',   platforms: ['facebook'] });
    const postFail = makePost({ id: 'post-fail',  platforms: ['facebook'] });

    // Claim → 3 posts
    mockQuery.mockResolvedValueOnce([postSkip, postOk, postFail]);

    // --- postSkip: no active instagram connection → skipped ---
    mockQuery.mockResolvedValueOnce([]); // no connections
    mockQuery.mockResolvedValueOnce([]); // reset to scheduled

    // --- postOk: facebook connected, publish succeeds ---
    mockQuery.mockResolvedValueOnce([{ platform: 'facebook' }]);
    mockQueryOne
      .mockResolvedValueOnce(postOk)                                    // SELECT post
      .mockResolvedValueOnce({ ...postOk, status: 'publishing' })       // UPDATE publishing
      .mockResolvedValueOnce(null)                                       // checkTokenExpiry
      .mockResolvedValueOnce({ ...postOk, status: 'posted' });          // final UPDATE
    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-ok' });

    // --- postFail: facebook connected, publisher throws ---
    mockQuery.mockResolvedValueOnce([{ platform: 'facebook' }]);
    mockQueryOne
      .mockResolvedValueOnce(postFail)
      .mockResolvedValueOnce({ ...postFail, status: 'publishing' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...postFail, status: 'failed' });
    mockPostToFacebook.mockRejectedValueOnce(new Error('Facebook API error: 500 Internal Server Error'));

    const result = await runAutoPublish();

    expect(result).toEqual({ published: 1, failed: 1, skipped: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('publishPost()', () => {
  it('throws "Post not found" when the post does not exist in DB', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(publishPost('nonexistent-post')).rejects.toThrow('Post not found');
  });

  it('throws when APP_URL env variable is not set', async () => {
    delete process.env.APP_URL;
    mockQueryOne.mockResolvedValueOnce(makePost());

    await expect(publishPost('post-1')).rejects.toThrow('APP_URL environment variable is not set');

    // Restore for other tests
    process.env.APP_URL = 'https://example.com';
  });

  it('sets status to "publishing" before attempting to publish', async () => {
    const post = makePost({ platforms: ['facebook'] });

    mockQueryOne
      .mockResolvedValueOnce(post)                                    // SELECT post
      .mockResolvedValueOnce({ ...post, status: 'publishing' })       // UPDATE publishing
      .mockResolvedValueOnce(null)                                     // checkTokenExpiry
      .mockResolvedValueOnce({ ...post, status: 'posted' });          // final UPDATE

    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-111' });

    await publishPost('post-1');

    // The second queryOne call must be the UPDATE ... SET status = 'publishing'
    const publishingUpdateCall = mockQueryOne.mock.calls[1];
    const sql: string = publishingUpdateCall[0];
    expect(sql).toMatch(/UPDATE posts SET status = 'publishing'/i);
    expect(publishingUpdateCall[1]).toContain('post-1');
  });

  it('returns results array with per-platform results on success', async () => {
    const post = makePost({ platforms: ['facebook', 'linkedin'] });

    mockQueryOne
      .mockResolvedValueOnce(post)                                       // SELECT post
      .mockResolvedValueOnce({ ...post, status: 'publishing' })          // UPDATE publishing
      .mockResolvedValueOnce(null)                                        // checkTokenExpiry facebook
      .mockResolvedValueOnce(null)                                        // checkTokenExpiry linkedin
      .mockResolvedValueOnce({ ...post, status: 'posted' });             // final UPDATE

    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-abc' });
    mockPostToLinkedIn.mockResolvedValueOnce({ postId: 'li-xyz' });

    const results = await publishPost('post-1');

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ platform: 'facebook', success: true, postId: 'fb-abc' });
    expect(results[1]).toMatchObject({ platform: 'linkedin', success: true, postId: 'li-xyz' });
  });

  it('sets final status to "posted" when all platforms succeed', async () => {
    const post = makePost({ platforms: ['facebook'] });

    mockQueryOne
      .mockResolvedValueOnce(post)
      .mockResolvedValueOnce({ ...post, status: 'publishing' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...post, status: 'posted' });

    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-done' });

    await publishPost('post-1');

    const finalUpdateCall = mockQueryOne.mock.calls[3];
    const sql: string = finalUpdateCall[0];
    expect(sql).toMatch(/UPDATE posts SET status = \$1/i);
    expect(finalUpdateCall[1][0]).toBe('posted');
  });

  it('sets final status to "failed" when all platforms fail', async () => {
    const post = makePost({ platforms: ['facebook'] });

    mockQueryOne
      .mockResolvedValueOnce(post)
      .mockResolvedValueOnce({ ...post, status: 'publishing' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...post, status: 'failed' });

    mockPostToFacebook.mockRejectedValueOnce(new Error('Facebook not connected'));

    await publishPost('post-1');

    const finalUpdateCall = mockQueryOne.mock.calls[3];
    expect(finalUpdateCall[1][0]).toBe('failed');
  });

  it('sets final status to "partially_posted" when only some platforms succeed', async () => {
    const post = makePost({ platforms: ['facebook', 'linkedin'] });

    mockQueryOne
      .mockResolvedValueOnce(post)
      .mockResolvedValueOnce({ ...post, status: 'publishing' })
      .mockResolvedValueOnce(null)  // checkTokenExpiry facebook
      .mockResolvedValueOnce(null)  // checkTokenExpiry linkedin
      .mockResolvedValueOnce({ ...post, status: 'partially_posted' });

    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-ok' });
    mockPostToLinkedIn.mockRejectedValueOnce(new Error('LinkedIn not connected'));

    await publishPost('post-1');

    const finalUpdateCall = mockQueryOne.mock.calls[4];
    expect(finalUpdateCall[1][0]).toBe('partially_posted');
  });

  it('stores serialised publish_results in the final UPDATE', async () => {
    const post = makePost({ platforms: ['facebook'] });

    mockQueryOne
      .mockResolvedValueOnce(post)
      .mockResolvedValueOnce({ ...post, status: 'publishing' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...post, status: 'posted' });

    mockPostToFacebook.mockResolvedValueOnce({ postId: 'fb-result' });

    await publishPost('post-1');

    const finalUpdateCall = mockQueryOne.mock.calls[3];
    // $2 is the JSON-stringified publish_results
    const publishResults = JSON.parse(finalUpdateCall[1][1] as string);
    expect(publishResults.facebook).toMatchObject({ success: true, postId: 'fb-result' });
  });

  it('records token-refresh failure as a platform error without throwing', async () => {
    const post = makePost({ platforms: ['linkedin'] });

    // SELECT post
    mockQueryOne.mockResolvedValueOnce(post);
    // UPDATE status = 'publishing'
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'publishing' });

    // checkTokenExpiry: connection exists and token is near-expiry
    const nearExpiry = new Date(Date.now() - 1000).toISOString(); // already past
    mockQueryOne.mockResolvedValueOnce({
      expires_at: nearExpiry,
      credentials: { access_token: 'old', refresh_token: 'rt', org_id: '42' },
    });

    // Advisory lock acquired
    mockQueryOne.mockResolvedValueOnce({ acquired: true });

    // LinkedIn token refresh HTTP call fails
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    vi.stubGlobal('fetch', mockFetch);

    // DB: UPDATE status = 'expired'
    mockQuery.mockResolvedValueOnce([]);
    // Advisory unlock
    mockQuery.mockResolvedValueOnce([]);

    // Final UPDATE (all failed)
    mockQueryOne.mockResolvedValueOnce({ ...post, status: 'failed' });

    const results = await publishPost('post-1');

    expect(results[0].success).toBe(false);
    expect(results[0].error).toMatch(/LinkedIn token refresh failed/i);
  });
});
