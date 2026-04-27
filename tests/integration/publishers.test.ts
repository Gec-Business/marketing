/**
 * Integration tests for individual platform publishers:
 *   lib/publishers/facebook.ts
 *   lib/publishers/instagram.ts
 *   lib/publishers/linkedin.ts (bonus — LinkedIn is exercised via engine tests
 *   but a direct coverage test is included here too)
 *
 * vi.mock('@/lib/db') prevents any real DB connections.
 * vi.stubGlobal('fetch', ...) intercepts every outbound HTTP call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { postToFacebook } from '@/lib/publishers/facebook';
import { postToInstagram } from '@/lib/publishers/instagram';
import { postToLinkedIn } from '@/lib/publishers/linkedin';
import { queryOne } from '@/lib/db';

const mockQueryOne = queryOne as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFacebookConn() {
  return {
    credentials: {
      page_id: 'page-123',
      page_token: 'token-abc',
    },
  };
}

function makeInstagramConn() {
  return {
    credentials: {
      ig_account_id: 'ig-456',
      access_token: 'ig-token-xyz',
    },
  };
}

function makeLinkedInConn() {
  return {
    credentials: {
      access_token: 'li-token',
      org_id: '99999',
    },
  };
}

/** Build a minimal mock Response object */
function mockResponse(body: unknown, ok = true, status = 200, headers?: Record<string, string>) {
  const headersMap = new Map(Object.entries(headers ?? {}));
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) ?? null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-chars!!';
  vi.stubGlobal('fetch', vi.fn());
});

// ─────────────────────────────────────────────────────────────────────────────
describe('postToFacebook()', () => {
  it('throws "Facebook not connected" when there is no active social connection', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(postToFacebook('tenant-1', 'Hello', undefined))
      .rejects.toThrow('Facebook not connected');
  });

  it('throws on non-ok API response (text-only post)', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ error: 'bad' }, false, 400)
    );

    await expect(postToFacebook('tenant-1', 'Hello', undefined))
      .rejects.toThrow('Facebook API error: 400');
  });

  it('throws on non-ok API response (photo post)', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ error: 'bad' }, false, 403)
    );

    await expect(postToFacebook('tenant-1', 'Hello', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Facebook API error: 403');
  });

  it('throws "Facebook: No post ID returned" when the photo API returns no id', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    // API is ok but returns no `id` and no `post_id`
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ success: true /* no id */ }, true, 200)
    );

    await expect(postToFacebook('tenant-1', 'Hello', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Facebook: No post ID returned from API');
  });

  it('throws "Facebook: No post ID returned" when the feed API returns no id', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ success: true }, true, 200)
    );

    await expect(postToFacebook('tenant-1', 'Caption only'))
      .rejects.toThrow('Facebook: No post ID returned from API');
  });

  it('throws when API returns an error object in the response body', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ error: { message: 'OAuthException: invalid token' } }, true, 200)
    );

    await expect(postToFacebook('tenant-1', 'Hello'))
      .rejects.toThrow('OAuthException: invalid token');
  });

  it('returns {postId} on success for a photo post', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ id: 'photo-post-789' }, true, 200)
    );

    const result = await postToFacebook('tenant-1', 'My caption', 'https://cdn.example.com/photo.jpg');
    expect(result).toEqual({ postId: 'photo-post-789' });
  });

  it('returns {postId} on success for a text-only post', async () => {
    mockQueryOne.mockResolvedValueOnce(makeFacebookConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ id: 'feed-post-321' }, true, 200)
    );

    const result = await postToFacebook('tenant-1', 'Just text');
    expect(result).toEqual({ postId: 'feed-post-321' });
  });

  it('uses page_id and page_token from credentials in the API call', async () => {
    const conn = makeFacebookConn();
    mockQueryOne.mockResolvedValueOnce(conn);

    const mockFetch = vi.fn().mockResolvedValueOnce(mockResponse({ id: 'fb-111' }));
    vi.stubGlobal('fetch', mockFetch);

    await postToFacebook('tenant-1', 'Caption');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('page-123');
    const body = JSON.parse(options.body as string);
    expect(body.access_token).toBe('token-abc');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('postToInstagram()', () => {
  it('throws "Instagram not connected" when there is no active connection', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Instagram not connected');
  });

  it('throws on non-ok response from the container creation call', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ error: 'bad' }, false, 500)
    );

    await expect(postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Instagram API error: 500');
  });

  it('throws on ERROR status_code during polling', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      // Container creation → ok
      .mockResolvedValueOnce(mockResponse({ id: 'container-001' }))
      // First status poll → ERROR
      .mockResolvedValueOnce(mockResponse({ status_code: 'ERROR' }));

    vi.stubGlobal('fetch', mockFetch);

    await expect(postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Instagram image processing failed: ERROR');
  });

  it('throws on EXPIRED status_code during polling (recently added guard)', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      // Container creation → ok
      .mockResolvedValueOnce(mockResponse({ id: 'container-002' }))
      // First status poll → EXPIRED
      .mockResolvedValueOnce(mockResponse({ status_code: 'EXPIRED' }));

    vi.stubGlobal('fetch', mockFetch);

    await expect(postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Instagram image processing failed: EXPIRED');
  });

  it('returns {postId} on success after polling resolves with FINISHED', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      // Container creation
      .mockResolvedValueOnce(mockResponse({ id: 'container-ok' }))
      // First status poll → IN_PROGRESS
      .mockResolvedValueOnce(mockResponse({ status_code: 'IN_PROGRESS' }))
      // Second status poll → FINISHED
      .mockResolvedValueOnce(mockResponse({ status_code: 'FINISHED' }))
      // Publish
      .mockResolvedValueOnce(mockResponse({ id: 'ig-post-555' }));

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg');
    expect(result).toEqual({ postId: 'ig-post-555' });
  });

  it('returns {postId} on success after polling resolves with READY', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse({ id: 'container-ready' }))
      .mockResolvedValueOnce(mockResponse({ status_code: 'READY' }))
      .mockResolvedValueOnce(mockResponse({ id: 'ig-post-ready-777' }));

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg');
    expect(result).toEqual({ postId: 'ig-post-ready-777' });
  });

  it('throws "Instagram: No post ID returned" when the publish call returns no id', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse({ id: 'container-xyz' }))
      .mockResolvedValueOnce(mockResponse({ status_code: 'FINISHED' }))
      // Publish returns ok but no id
      .mockResolvedValueOnce(mockResponse({ success: true }));

    vi.stubGlobal('fetch', mockFetch);

    await expect(postToInstagram('tenant-1', 'Caption', 'https://cdn.example.com/img.jpg'))
      .rejects.toThrow('Instagram: No post ID returned from API');
  });

  it('includes ig_account_id and access_token in the container request', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInstagramConn());

    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse({ id: 'cid' }))
      .mockResolvedValueOnce(mockResponse({ status_code: 'FINISHED' }))
      .mockResolvedValueOnce(mockResponse({ id: 'pub-id' }));

    vi.stubGlobal('fetch', mockFetch);

    await postToInstagram('tenant-1', 'My caption', 'https://cdn.example.com/img.jpg');

    const [containerUrl, containerOptions] = mockFetch.mock.calls[0];
    expect(containerUrl).toContain('ig-456');
    const body = JSON.parse(containerOptions.body as string);
    expect(body.access_token).toBe('ig-token-xyz');
    expect(body.image_url).toBe('https://cdn.example.com/img.jpg');
    expect(body.caption).toBe('My caption');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('postToLinkedIn()', () => {
  it('throws "LinkedIn not connected" when there is no active connection', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(postToLinkedIn('tenant-1', 'Post text'))
      .rejects.toThrow('LinkedIn not connected');
  });

  it('throws on non-ok API response when creating a post', async () => {
    mockQueryOne.mockResolvedValueOnce(makeLinkedInConn());

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ message: 'Unauthorized' }, false, 401, { 'x-restli-id': '' })
    );

    await expect(postToLinkedIn('tenant-1', 'Post text'))
      .rejects.toThrow(/LinkedIn API error: 401/);
  });

  it('returns {postId} from the x-restli-id response header on success', async () => {
    mockQueryOne.mockResolvedValueOnce(makeLinkedInConn());

    const mockFetch = vi.fn().mockResolvedValueOnce(
      mockResponse({}, true, 201, { 'x-restli-id': 'urn:li:ugcPost:9876543210' })
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await postToLinkedIn('tenant-1', 'Post text');
    expect(result).toEqual({ postId: 'urn:li:ugcPost:9876543210' });
  });

  it('returns postId "unknown" when header is absent (graceful fallback)', async () => {
    mockQueryOne.mockResolvedValueOnce(makeLinkedInConn());

    const mockFetch = vi.fn().mockResolvedValueOnce(
      mockResponse({}, true, 201) // no x-restli-id header
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await postToLinkedIn('tenant-1', 'Post text');
    expect(result.postId).toBe('unknown');
  });

  it('sends an urn:li:organization author derived from org_id', async () => {
    mockQueryOne.mockResolvedValueOnce(makeLinkedInConn());

    const mockFetch = vi.fn().mockResolvedValueOnce(
      mockResponse({}, true, 201, { 'x-restli-id': 'post-id' })
    );
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn('tenant-1', 'Post text');

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.author).toBe('urn:li:organization:99999');
    expect(body.commentary).toBe('Post text');
    expect(body.lifecycleState).toBe('PUBLISHED');
    expect(body.visibility).toBe('PUBLIC');
  });

  it('performs image upload flow when imageUrl is provided', async () => {
    mockQueryOne.mockResolvedValueOnce(makeLinkedInConn());

    const mockFetch = vi.fn()
      // initializeUpload
      .mockResolvedValueOnce(mockResponse({
        value: { uploadUrl: 'https://li-upload.example.com/upload', image: 'urn:li:image:abc' },
      }))
      // Fetch the image itself
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      // PUT to uploadUrl
      .mockResolvedValueOnce({ ok: true, status: 200 })
      // Create post
      .mockResolvedValueOnce(mockResponse({}, true, 201, { 'x-restli-id': 'post-with-img' }));

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToLinkedIn('tenant-1', 'Post with image', 'https://cdn.example.com/img.jpg');

    expect(result.postId).toBe('post-with-img');
    // Verify the post body includes the image URN
    const postCallBody = JSON.parse(mockFetch.mock.calls[3][1].body as string);
    expect(postCallBody.content?.media?.id).toBe('urn:li:image:abc');
  });
});
