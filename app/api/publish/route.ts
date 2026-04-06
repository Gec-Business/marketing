import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { publishPost } from '@/lib/publishers/engine';

export async function POST(req: NextRequest) {
  await requireOperator();
  const { post_id } = await req.json();

  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 });
  }

  try {
    const results = await publishPost(post_id);
    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
