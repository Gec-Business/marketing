import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await queryOne(
    'SELECT i.*, t.name as tenant_name, t.city as tenant_city FROM invoices i JOIN tenants t ON i.tenant_id = t.id WHERE i.id = $1',
    [id]
  );
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const inv = invoice as any;
  if (user.role === 'tenant' && user.tenant_id !== inv.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  let y = height - 50;

  // Header
  page.drawText('INVOICE', { x: 50, y, font: fontBold, size: 24, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(inv.invoice_number, { x: 400, y, font, size: 12, color: rgb(0.4, 0.4, 0.4) });
  y -= 40;

  // From
  page.drawText('From: MK Platform', { x: 50, y, font: fontBold, size: 10 });
  y -= 15;
  page.drawText('mk.gecbusiness.com', { x: 50, y, font, size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 25;

  // To
  page.drawText(`To: ${inv.tenant_name}`, { x: 50, y, font: fontBold, size: 10 });
  y -= 15;
  page.drawText(inv.tenant_city || 'Tbilisi, Georgia', { x: 50, y, font, size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 25;

  // Period
  page.drawText(`Period: ${inv.period_start} - ${inv.period_end}`, { x: 50, y, font, size: 9 });
  if (inv.due_date) {
    page.drawText(`Due: ${inv.due_date}`, { x: 400, y, font, size: 9 });
  }
  y -= 30;

  // Table header
  page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 20, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('Description', { x: 55, y, font: fontBold, size: 9 });
  page.drawText('Amount', { x: 470, y, font: fontBold, size: 9 });
  y -= 25;

  // Items
  const items = Array.isArray(inv.items) ? inv.items : JSON.parse(inv.items);
  for (const item of items) {
    page.drawText(item.description, { x: 55, y, font, size: 9 });
    page.drawText(`${inv.currency} ${Number(item.amount).toFixed(2)}`, { x: 460, y, font, size: 9 });
    y -= 18;
  }

  // Total
  y -= 10;
  page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: 545, y: y + 5 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  page.drawText('Total:', { x: 400, y: y - 10, font: fontBold, size: 11 });
  page.drawText(`${inv.currency} ${Number(inv.total_amount).toFixed(2)}`, { x: 460, y: y - 10, font: fontBold, size: 11 });

  // Status
  y -= 40;
  page.drawText(`Status: ${inv.status.toUpperCase()}`, { x: 50, y, font, size: 9, color: inv.status === 'paid' ? rgb(0, 0.6, 0) : rgb(0.8, 0.4, 0) });

  if (inv.notes) {
    y -= 25;
    page.drawText('Notes:', { x: 50, y, font: fontBold, size: 9 });
    y -= 15;
    page.drawText(inv.notes, { x: 50, y, font, size: 8, color: rgb(0.4, 0.4, 0.4) });
  }

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${inv.invoice_number}.pdf"`,
    },
  });
  } catch (error: any) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
