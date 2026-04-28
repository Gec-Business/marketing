import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDesc = req.nextUrl.searchParams.get('error_description');

  if (error) {
    return new NextResponse(`<html><body><h2>Facebook Error</h2><p>${error}: ${errorDesc}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const savedState = state ? await queryOne<{ tenant_id: string }>(
    `DELETE FROM oauth_states WHERE state = $1 AND platform = 'facebook' AND expires_at > now() RETURNING tenant_id`,
    [state]
  ) : null;

  if (!code || !savedState) {
    return new NextResponse('<html><body><h2>Authorization failed</h2><p>Invalid or expired state. Please try again.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const tenantId = savedState.tenant_id;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;

  const tokenRes = await fetch('https://graph.facebook.com/v25.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: appId!, redirect_uri: redirectUri, client_secret: appSecret!, code }),
  });
  if (!tokenRes.ok) {
    return new NextResponse(`<html><body><h2>Error</h2><p>Facebook API returned ${tokenRes.status}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }
  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return new NextResponse(`<html><body><h2>Error</h2><p>${tokenData.error.message}</p></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const userToken = tokenData.access_token;
  const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?access_token=${userToken}`);
  const pagesData = await pagesRes.json();

  if (!pagesData.data?.length) {
    return new NextResponse('<html><body><h2>No pages found</h2><p>This Facebook account has no Pages. Please log in with an account that manages a Facebook Page.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  // Store pages temporarily and show picker
  const token = crypto.randomUUID();
  await query(
    `INSERT INTO fb_page_selections (token, tenant_id, pages, user_token) VALUES ($1, $2, $3, $4)`,
    [token, tenantId, JSON.stringify(pagesData.data), userToken]
  );

  const pageButtons = pagesData.data.map((p: { id: string; name: string }) => `
    <button onclick="selectPage('${p.id}')" style="display:block;width:100%;padding:12px 16px;margin:8px 0;background:#fff;border:2px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:15px;text-align:left;" onmouseover="this.style.borderColor='#1877F2'" onmouseout="this.style.borderColor='#e5e7eb'">
      📄 ${p.name}
    </button>`).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:400px;margin:40px auto;padding:20px;">
    <h2 style="color:#1877F2;">Choose Facebook Page</h2>
    <p style="color:#6b7280;">Select which page to post to:</p>
    ${pageButtons}
    <p id="status" style="color:#6b7280;font-size:13px;margin-top:16px;"></p>
    <script>
      async function selectPage(pageId) {
        document.getElementById('status').textContent = 'Connecting...';
        const res = await fetch('/api/connect/facebook/select-page', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ token: '${token}', page_id: pageId })
        });
        if (res.ok) {
          document.body.innerHTML = '<div style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;"><h2 style="color:#16a34a;">✓ Connected!</h2><p style="color:#6b7280;">Facebook Page connected successfully.</p></div>';
          setTimeout(() => window.close(), 2000);
        } else {
          document.getElementById('status').textContent = 'Error. Please try again.';
        }
      }
    </script>
  </body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
