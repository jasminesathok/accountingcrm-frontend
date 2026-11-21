import { jsPDF } from 'jspdf';

const fmtCurrency = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

// Generates and triggers a browser download of a clean invoice PDF built
// from data already available on the Invoices page - no backend endpoint needed.
export const downloadInvoicePdf = (invoice) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const invoiceNumber = invoice.invoice_number || `INV-${String(invoice.id).padStart(4, '0')}`;
  const clientName = `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim() || invoice.company_name || 'Client';
  const items = invoice.items || [];

  const marginX = 48;
  const rightX = 547;
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text((invoice.invoice_type === 'proforma' ? 'PROFORMA INVOICE' : invoice.invoice_type === 'credit_invoice' ? 'CREDIT INVOICE' : 'TAX INVOICE'), marginX, y);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber, rightX, y, { align: 'right' });

  y += 34;
  doc.setDrawColor(220);
  doc.line(marginX, y, rightX, y);

  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Billed To', marginX, y);
  doc.text('Invoice Details', 320, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const billTo = [
    clientName,
    invoice.contact_person ? `Attn: ${invoice.contact_person}` : null,
    invoice.company_name && invoice.company_name !== clientName ? invoice.company_name : null,
    invoice.email_address || invoice.client_email || null,
    invoice.mobile_number || invoice.client_phone || null,
    (invoice.gst_number || invoice.client_gst_number) ? `GSTIN: ${invoice.gst_number || invoice.client_gst_number}` : null,
    invoice.billing_address || null
  ].filter(Boolean);

  const details = [
    `Invoice #: ${invoiceNumber}`,
    `Status: ${(invoice.status || '').replace('_', ' ').toUpperCase()}`,
    `Invoice Date: ${fmtDate(invoice.invoice_date || invoice.created_at)}`,
    `Due Date: ${fmtDate(invoice.due_date)}`,
    invoice.reference_number ? `Ref #: ${invoice.reference_number}` : null,
    invoice.sales_person ? `Sales Person: ${invoice.sales_person}` : null
  ].filter(Boolean);

  let billY = y;
  billTo.forEach((line) => { doc.text(String(line), marginX, billY, { maxWidth: 240 }); billY += 15; });

  let detailY = y;
  details.forEach((line) => { doc.text(line, 320, detailY); detailY += 15; });

  y = Math.max(billY, detailY) + 20;

  // Items table header
  doc.setFillColor(245, 246, 248);
  doc.rect(marginX, y, 499, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Item', marginX + 8, y + 15);
  doc.text('Qty', 330, y + 15, { align: 'right' });
  doc.text('Unit Price', 410, y + 15, { align: 'right' });
  doc.text('Tax', 460, y + 15, { align: 'right' });
  doc.text('Amount', rightX - 10, y + 15, { align: 'right' });
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const rows = items.length ? items : [{ product_service: `Invoice ${invoiceNumber} for ${clientName}`, quantity: 1, unit_price: invoice.total_amount, tax_percent: 0, line_total: invoice.total_amount }];

  rows.forEach((it) => {
    const rowH = 20;
    doc.setDrawColor(230);
    doc.rect(marginX, y, 499, rowH);
    doc.text(String(it.product_service || ''), marginX + 8, y + 14, { maxWidth: 220 });
    doc.text(String(it.quantity ?? ''), 330, y + 14, { align: 'right' });
    doc.text(fmtCurrency(it.unit_price), 410, y + 14, { align: 'right' });
    doc.text(`${it.tax_percent || 0}%`, 460, y + 14, { align: 'right' });
    doc.text(fmtCurrency(it.line_total ?? it.quantity * it.unit_price), rightX - 10, y + 14, { align: 'right' });
    y += rowH;
  });

  y += 16;

  // Totals block
  const totalsLines = [
    ['Sub Total', invoice.sub_total],
    invoice.discount ? ['Discount', -invoice.discount] : null,
    invoice.shipping_charges ? ['Shipping Charges', invoice.shipping_charges] : null,
    invoice.other_charges ? ['Other Charges', invoice.other_charges] : null,
    invoice.total_tax ? ['Total Tax', invoice.total_tax] : null,
    invoice.round_off ? ['Round Off', invoice.round_off] : null
  ].filter(Boolean);

  const totalsX = 350;
  doc.setFontSize(9.5);
  totalsLines.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, y);
    doc.text(fmtCurrency(val), rightX, y, { align: 'right' });
    y += 15;
  });

  y += 4;
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsX - 10, y - 12, 209, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total', totalsX, y + 4);
  doc.text(fmtCurrency(invoice.total_amount), rightX, y + 4, { align: 'right' });

  y += 26;
  if (invoice.amount_paid) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Amount Paid', totalsX, y);
    doc.text(fmtCurrency(invoice.amount_paid), rightX, y, { align: 'right' });
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due', totalsX, y);
    doc.text(fmtCurrency(invoice.balance_due ?? (invoice.total_amount - invoice.amount_paid)), rightX, y, { align: 'right' });
    y += 15;
  }

  y += 20;
  if (invoice.bank_name || invoice.account_number || invoice.upi_id) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bank Details', marginX, y);
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const bank = [
      invoice.bank_name ? `Bank: ${invoice.bank_name}` : null,
      invoice.account_holder_name ? `Account Holder: ${invoice.account_holder_name}` : null,
      invoice.account_number ? `Account No: ${invoice.account_number}` : null,
      invoice.ifsc_code ? `IFSC: ${invoice.ifsc_code}` : null,
      invoice.upi_id ? `UPI: ${invoice.upi_id}` : null
    ].filter(Boolean);
    bank.forEach((line) => { doc.text(line, marginX, y); y += 13; });
    y += 8;
  }

  if (invoice.terms_conditions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions', marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(invoice.terms_conditions), marginX, y, { maxWidth: 499 });
    y += 26;
  }

  if (invoice.customer_notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes', marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(invoice.customer_notes), marginX, y, { maxWidth: 499 });
    y += 26;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('This is a system-generated invoice.', marginX, 780);

  doc.save(`${invoiceNumber}.pdf`);
};
