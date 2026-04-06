import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { getIndustryQuestions } from '@/lib/ai/onboarding-questions';

export async function POST(req: NextRequest) {
  await requireOperator();
  const { industry, businessName } = await req.json();
  if (!industry || !businessName) {
    return NextResponse.json({ error: 'Industry and business name required' }, { status: 400 });
  }
  const { questions, tokensUsed } = await getIndustryQuestions(industry, businessName);
  return NextResponse.json({ questions, tokensUsed });
}
