import { useState, useEffect, useCallback, useMemo } from 'react';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../api/invoices';
import { getClients } from '../api/clients';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Pencil, Trash2, Search, Download, X } from 'lucide-react';
import { downloadInvoicePdf } from '../utils/invoicePdf';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const num = (v) => Number(v) || 0;

let itemSeq = 0;
const blankItem = () => ({
  _key: `new-${++itemSeq}`,
  product_service: '', description: '', hsn_sac_code: '',
  quantity: 1, unit: 'PCS', unit_price: '',
  discount_percent: 0, tax_percent: 0
});

const EMPTY = {
  client_id: '',
  // Basic information
  invoice_number: '', invoice_date: '', due_date: '', invoice_type: 'tax_invoice',
  reference_number: '', sales_person: '', currency: 'INR', status: 'pending',
  // Client information
  contact_person: '', mobile_number: '', email_address: '',
  billing_address: '', shipping_address: '', gst_number: '', state_code: '',
  // Payment summary (header level)
  discount: 0, shipping_charges: 0, other_charges: 0, round_off: 0,
  cgst: 0, sgst: 0, igst: 0,
  amount_paid: 0, payment_method: '', payment_status: 'unpaid',
  // Bank details
  bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '',
  // Notes
  terms_conditions: '', customer_notes: '', internal_notes: '',
  items: [blankItem()]
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const limit = 10;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, cli] = await Promise.all([getInvoices({ search, page, limit }), getClients({ limit: 100 })]);
      setInvoices(inv.data.rows);
      setTotal(inv.data.total);
      setClients(cli.data.rows);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };

  const openEdit = (i) => {
    setEditing(i);
    setForm({
      client_id: i.client_id,
      invoice_number: i.invoice_number || '', invoice_date: i.invoice_date?.split('T')[0] || '',
      due_date: i.due_date?.split('T')[0] || '', invoice_type: i.invoice_type || 'tax_invoice',
      reference_number: i.reference_number || '', sales_person: i.sales_person || '',
      currency: i.currency || 'INR', status: i.status || 'pending',
      contact_person: i.contact_person || '', mobile_number: i.mobile_number || '',
      email_address: i.email_address || '', billing_address: i.billing_address || '',
      shipping_address: i.shipping_address || '', gst_number: i.gst_number || '', state_code: i.state_code || '',
      discount: i.discount || 0, shipping_charges: i.shipping_charges || 0, other_charges: i.other_charges || 0,
      round_off: i.round_off || 0, cgst: i.cgst || 0, sgst: i.sgst || 0, igst: i.igst || 0,
      amount_paid: i.amount_paid || 0, payment_method: i.payment_method || '', payment_status: i.payment_status || 'unpaid',
      bank_name: i.bank_name || '', account_holder_name: i.account_holder_name || '', account_number: i.account_number || '',
      ifsc_code: i.ifsc_code || '', upi_id: i.upi_id || '',
      terms_conditions: i.terms_conditions || '', customer_notes: i.customer_notes || '', internal_notes: i.internal_notes || '',
      items: (i.items && i.items.length ? i.items : [{}]).map(it => ({
        _key: `existing-${it.id ?? ++itemSeq}`,
        product_service: it.product_service || '', description: it.description || '', hsn_sac_code: it.hsn_sac_code || '',
        quantity: it.quantity ?? 1, unit: it.unit || 'PCS', unit_price: it.unit_price ?? '',
        discount_percent: it.discount_percent ?? 0, tax_percent: it.tax_percent ?? 0
      }))
    });
    setModal(true);
  };

  // Live client-side preview of totals; the server recomputes authoritatively on save.
  const totals = useMemo(() => {
    const items = form.items.map(it => {
      const gross = num(it.quantity) * num(it.unit_price);
      const discountAmount = gross * (num(it.discount_percent) / 100);
      const taxable = gross - discountAmount;
      const taxAmount = taxable * (num(it.tax_percent) / 100);
      return { gross, discountAmount, taxAmount, lineTotal: taxable + taxAmount };
    });
    const subTotal = items.reduce((s, i) => s + i.gross, 0);
    const itemDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
    const itemTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const taxableAmount = subTotal - itemDiscount;
    const manualTax = num(form.cgst) + num(form.sgst) + num(form.igst);
    const totalTax = itemTax || manualTax;
    const grandTotal = taxableAmount - num(form.discount) + totalTax + num(form.shipping_charges) + num(form.other_charges) + num(form.round_off);
    const balanceDue = grandTotal - num(form.amount_paid);
    return { items, subTotal, taxableAmount, totalTax, grandTotal, balanceDue };
  }, [form.items, form.discount, form.shipping_charges, form.other_charges, form.round_off, form.cgst, form.sgst, form.igst, form.amount_paid]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const setItem = (key, field, value) => setForm(f => ({
    ...f,
    items: f.items.map(it => it._key === key ? { ...it, [field]: value } : it)
  }));

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (key) => setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it._key !== key) : f.items }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        items: form.items
          .filter(it => it.product_service.trim())
          .map(({ _key, ...it }) => it)
      };
      if (editing) await updateInvoice(editing.id, payload);
      else await createInvoice(payload);
      setModal(false); fetchInvoices();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try { await deleteInvoice(id); fetchInvoices(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (v, r) => v || `INV-${String(r.id).padStart(4, '0')}` },
    { key: 'first_name', label: 'Client', render: (_, r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.company_name },
    { key: 'invoice_date', label: 'Invoice Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'total_amount', label: 'Grand Total', render: (v) => fmt(v) },
    { key: 'balance_due', label: 'Balance Due', render: (v) => fmt(v) },
    { key: 'status', label: 'Status', badge: true },
    { key: 'payment_status', label: 'Payment', badge: true },
    { key: 'due_date', label: 'Due Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" title="Download invoice" onClick={() => downloadInvoicePdf(r)}><Download size={14} /></button>
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Invoices" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search invoices..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Invoice</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={invoices} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Invoice' : 'New Invoice'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Client</label>
              <select value={form.client_id} onChange={e => setField('client_id', e.target.value)} required>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} – {c.company_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Invoice Number</label>
              <input placeholder="Auto if left blank" value={form.invoice_number} onChange={e => setField('invoice_number', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Invoice Date</label><input type="date" value={form.invoice_date} onChange={e => setField('invoice_date', e.target.value)} /></div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setField('due_date', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Invoice Type</label>
              <select value={form.invoice_type} onChange={e => setField('invoice_type', e.target.value)}>
                <option value="tax_invoice">Tax Invoice</option>
                <option value="proforma">Proforma</option>
                <option value="credit_invoice">Credit Invoice</option>
              </select>
            </div>
            <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Sales Person</label><input value={form.sales_person} onChange={e => setField('sales_person', e.target.value)} /></div>
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Invoice Status</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="draft">Draft</option><option value="pending">Pending</option><option value="sent">Sent</option>
              <option value="paid">Paid</option><option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Client information */}
          <h4 className="form-section-title">Client Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group"><label>Mobile Number</label><input value={form.mobile_number} onChange={e => setField('mobile_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>
            <div className="form-group"><label>GST Number</label><input value={form.gst_number} onChange={e => setField('gst_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Billing Address</label><textarea rows={2} value={form.billing_address} onChange={e => setField('billing_address', e.target.value)} /></div>
            <div className="form-group"><label>Shipping Address</label><textarea rows={2} value={form.shipping_address} onChange={e => setField('shipping_address', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>State Code</label><input style={{ maxWidth: 120 }} value={form.state_code} onChange={e => setField('state_code', e.target.value)} /></div>

          {/* Invoice items */}
          <h4 className="form-section-title">Invoice Items</h4>
          <div className="invoice-items-table">
            <table className="table-mini">
              <thead>
                <tr>
                  <th>Product/Service</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th>
                  <th>Unit Price</th><th>Disc %</th><th>Tax %</th><th>Line Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={it._key}>
                    <td><input value={it.product_service} onChange={e => setItem(it._key, 'product_service', e.target.value)} placeholder="Item / service name" /></td>
                    <td><input value={it.hsn_sac_code} onChange={e => setItem(it._key, 'hsn_sac_code', e.target.value)} style={{ width: 80 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.quantity} onChange={e => setItem(it._key, 'quantity', e.target.value)} style={{ width: 64 }} /></td>
                    <td><input value={it.unit} onChange={e => setItem(it._key, 'unit', e.target.value)} style={{ width: 64 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.unit_price} onChange={e => setItem(it._key, 'unit_price', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.discount_percent} onChange={e => setItem(it._key, 'discount_percent', e.target.value)} style={{ width: 64 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.tax_percent} onChange={e => setItem(it._key, 'tax_percent', e.target.value)} style={{ width: 64 }} /></td>
                    <td className="line-total-cell">{fmt(totals.items[idx]?.lineTotal)}</td>
                    <td><button type="button" className="icon-btn-sm danger" onClick={() => removeItem(it._key)}><X size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={14} /> Add Item</button>
          </div>

          {/* Tax & payment summary */}
          <h4 className="form-section-title">Tax &amp; Payment Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Overall Discount (₹)</label><input type="number" step="0.01" value={form.discount} onChange={e => setField('discount', e.target.value)} /></div>
            <div className="form-group"><label>Shipping Charges (₹)</label><input type="number" step="0.01" value={form.shipping_charges} onChange={e => setField('shipping_charges', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Other Charges (₹)</label><input type="number" step="0.01" value={form.other_charges} onChange={e => setField('other_charges', e.target.value)} /></div>
            <div className="form-group"><label>Round Off (₹)</label><input type="number" step="0.01" value={form.round_off} onChange={e => setField('round_off', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>CGST (₹)</label><input type="number" step="0.01" value={form.cgst} onChange={e => setField('cgst', e.target.value)} /></div>
            <div className="form-group"><label>SGST (₹)</label><input type="number" step="0.01" value={form.sgst} onChange={e => setField('sgst', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>IGST (₹)</label><input type="number" step="0.01" style={{ maxWidth: 200 }} value={form.igst} onChange={e => setField('igst', e.target.value)} /></div>

          <div className="invoice-totals-summary">
            <div><span>Sub Total</span><b>{fmt(totals.subTotal)}</b></div>
            <div><span>Taxable Amount</span><b>{fmt(totals.taxableAmount)}</b></div>
            <div><span>Total Tax</span><b>{fmt(totals.totalTax)}</b></div>
            <div className="grand"><span>Grand Total</span><b>{fmt(totals.grandTotal)}</b></div>
            <div><span>Balance Due</span><b>{fmt(totals.balanceDue)}</b></div>
          </div>

          <div className="form-row">
            <div className="form-group"><label>Amount Paid (₹)</label><input type="number" step="0.01" value={form.amount_paid} onChange={e => setField('amount_paid', e.target.value)} /></div>
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)}>
                <option value="">Select...</option>
                <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option>
                <option value="card">Card</option><option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Payment Status</label>
            <select value={form.payment_status} onChange={e => setField('payment_status', e.target.value)}>
              <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
            </select>
          </div>

          {/* Bank details */}
          <h4 className="form-section-title">Bank Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
            <div className="form-group"><label>Account Holder Name</label><input value={form.account_holder_name} onChange={e => setField('account_holder_name', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Number</label><input value={form.account_number} onChange={e => setField('account_number', e.target.value)} /></div>
            <div className="form-group"><label>IFSC Code</label><input value={form.ifsc_code} onChange={e => setField('ifsc_code', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>UPI ID</label><input style={{ maxWidth: 260 }} value={form.upi_id} onChange={e => setField('upi_id', e.target.value)} /></div>

          {/* Notes */}
          <h4 className="form-section-title">Documents &amp; Notes</h4>
          <div className="form-group"><label>Terms &amp; Conditions</label><textarea rows={2} value={form.terms_conditions} onChange={e => setField('terms_conditions', e.target.value)} /></div>
          <div className="form-group"><label>Customer Notes</label><textarea rows={2} value={form.customer_notes} onChange={e => setField('customer_notes', e.target.value)} /></div>
          <div className="form-group"><label>Internal Notes (staff only)</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} /></div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Invoices;
