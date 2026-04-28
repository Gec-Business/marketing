import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { PDFDocument, rgb } from 'pdf-lib';
import { getGeorgianFont } from '@/lib/pdf-font';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const assessment = await queryOne(
    'SELECT a.*, t.name as tenant_name, t.industry, t.city FROM assessments a JOIN tenants t ON a.tenant_id = t.id WHERE a.id = $1',
    [id]
  );
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const a = assessment as any;
  if (user.role === 'tenant' && user.tenant_id !== a.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
  const pdf = await PDFDocument.create();
  const georgianFont = getGeorgianFont();
  const font = await pdf.embedFont(georgianFont);
  const fontBold = font;

  // Cover page
  const cover = pdf.addPage([595, 842]);
  cover.drawText('Brand Assessment', { x: 50, y: 700, font: fontBold, size: 32, color: rgb(0.1, 0.3, 0.7) });
  cover.drawText('& Strategy Report', { x: 50, y: 660, font: fontBold, size: 32, color: rgb(0.1, 0.3, 0.7) });
  cover.drawText(a.tenant_name, { x: 50, y: 600, font: fontBold, size: 20 });
  cover.drawText(`${a.industry} | ${a.city}`, { x: 50, y: 575, font, size: 14, color: rgb(0.4, 0.4, 0.4) });
  cover.drawText(`Generated: ${new Date(a.created_at).toLocaleDateString()}`, { x: 50, y: 540, font, size: 10, color: rgb(0.5, 0.5, 0.5) });
  cover.drawText('Prepared by MK Platform', { x: 50, y: 100, font, size: 10, color: rgb(0.5, 0.5, 0.5) });

  // Helper to add JSON section pages
  function addSection(title: string, data: any) {
    if (!data) return;
    const page = pdf.addPage([595, 842]);
    let y = 780;

    page.drawText(title, { x: 50, y, font: fontBold, size: 18, color: rgb(0.1, 0.3, 0.7) });
    y -= 30;

    const text = JSON.stringify(data, null, 2);
    const lines = text.split('\n');

    for (const line of lines) {
      if (y < 50) {
        const newPage = pdf.addPage([595, 842]);
        y = 780;
        // Draw on new page
        newPage.drawText(line.slice(0, 90), { x: 50, y, font, size: 7, color: rgb(0.2, 0.2, 0.2) });
      } else {
        page.drawText(line.slice(0, 90), { x: 50, y, font, size: 7, color: rgb(0.2, 0.2, 0.2) });
      }
      y -= 10;
    }
  }

  addSection('Research', a.research_data);
  addSection('Competitor Analysis', a.competitor_data);
  addSection('Brand Audit', a.brand_audit);
  addSection('Strategy', a.strategy_data);

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${a.tenant_name}.pdf"`,
    },
  });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
