import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBills, createBill, updateBill, deleteBill } from '../api/bills';
import { getVendors } from '../api/vendors';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const num = (v) => Number(v) || 0;

let itemSeq = 0;
const blankItem = () => ({
  _key: `new-${++itemSeq}`,
  product_service: '', description: '', hsn_sac_code: '',
  quantity: 1, unit: 'PCS', unit_cost: '',
  discount_percent: 0, tax_percent: 0
});

const EMPTY = {
  vendor_id: '',
  // Basic information
  bill_number: '', bill_date: '', due_date: '', bill_type: 'purchase_bill',
  reference_number: '', currency: 'INR', status: 'pending',
  // Vendor information
  contact_person: '', mobile_number: '', email_address: '', billing_address: '', gst_number: '',
  // Payment details (header level)
  discount: 0, shipping_charges: 0, other_charges: 0, round_off: 0,
  cgst: 0, sgst: 0, igst: 0,
  amount_paid: 0, payment_method: '', payment_status: 'unpaid', last_payment_date: '',
  // Attachments / tax details
  bill_attachment: '', terms_conditions: '', notes: '', internal_notes: '',
  // System fields
  created_by: '', approved_by: '', approved_date: '',
  items: [blankItem()]
};

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, v] = await Promise.all([getBills({ page, limit }), getVendors({ limit: 100 })]);
      setBills(b.data.rows); setTotal(b.data.total); setVendors(v.data.rows);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      vendor_id: b.vendor_id || '',
      bill_number: b.bill_number || '', bill_date: b.bill_date?.split('T')[0] || '',
      due_date: b.due_date?.split('T')[0] || '', bill_type: b.bill_type || 'purchase_bill',
      reference_number: b.reference_number || '', currency: b.currency || 'INR', status: b.status || 'pending',
      contact_person: b.contact_person || '', mobile_number: b.mobile_number || '',
      email_address: b.email_address || '', billing_address: b.billing_address || '', gst_number: b.gst_number || '',
      discount: b.discount || 0, shipping_charges: b.shipping_charges || 0, other_charges: b.other_charges || 0,
      round_off: b.round_off || 0, cgst: b.cgst || 0, sgst: b.sgst || 0, igst: b.igst || 0,
      amount_paid: b.amount_paid || 0, payment_method: b.payment_method || '', payment_status: b.payment_status || 'unpaid',
      last_payment_date: b.last_payment_date?.split('T')[0] || '',
      bill_attachment: b.bill_attachment || '', terms_conditions: b.terms_conditions || '',
      notes: b.notes || '', internal_notes: b.internal_notes || '',
      created_by: b.created_by || '', approved_by: b.approved_by || '', approved_date: b.approved_date?.split('T')[0] || '',
      items: (b.items && b.items.length ? b.items : [{}]).map(it => ({
        _key: `existing-${it.id ?? ++itemSeq}`,
        product_service: it.product_service || '', description: it.description || '', hsn_sac_code: it.hsn_sac_code || '',
        quantity: it.quantity ?? 1, unit: it.unit || 'PCS', unit_cost: it.unit_cost ?? '',
        discount_percent: it.discount_percent ?? 0, tax_percent: it.tax_percent ?? 0
      }))
    });
    setModal(true);
  };

  // Live client-side preview of totals; the server recomputes authoritatively on save.
  const totals = useMemo(() => {
    const items = form.items.map(it => {
      const gross = num(it.quantity) * num(it.unit_cost);
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
        vendor_id: form.vendor_id || null,
        items: form.items
          .filter(it => it.product_service.trim())
          .map(({ _key, ...it }) => it)
      };
      if (editing) await updateBill(editing.id, payload);
      else await createBill(payload);
      setModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try { await deleteBill(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const columns = [
    { key: 'bill_number', label: 'Bill #', render: (v, r) => v || `BILL-${String(r.id).padStart(4, '0')}` },
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'bill_date', label: 'Bill Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'amount', label: 'Grand Total', render: (v) => fmt(v) },
    { key: 'balance_due', label: 'Balance Due', render: (v) => fmt(v) },
    { key: 'status', label: 'Status', badge: true },
    { key: 'payment_status', label: 'Payment', badge: true },
    { key: 'due_date', label: 'Due Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Bills" />
      <div className="page-content">
        <div className="page-toolbar">
          <span className="toolbar-count">{total} bill{total !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Bill</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={bills} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Bill' : 'Add Bill'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Vendor</label>
              <select value={form.vendor_id} onChange={e => setField('vendor_id', e.target.value)}>
                <option value="">No vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} – {v.company_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Bill Number</label>
              <input placeholder="Auto if left blank" value={form.bill_number} onChange={e => setField('bill_number', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Bill Date</label><input type="date" value={form.bill_date} onChange={e => setField('bill_date', e.target.value)} /></div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setField('due_date', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Bill Type</label>
              <select value={form.bill_type} onChange={e => setField('bill_type', e.target.value)}>
                <option value="purchase_bill">Purchase Bill</option>
                <option value="service_bill">Service Bill</option>
              </select>
            </div>
            <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="form-group"><label>Bill Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="draft">Draft</option><option value="pending">Pending</option>
                <option value="paid">Paid</option><option value="partially_paid">Partially Paid</option>
                <option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Vendor information */}
          <h4 className="form-section-title">Vendor Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group"><label>Mobile Number</label><input value={form.mobile_number} onChange={e => setField('mobile_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>
            <div className="form-group"><label>GST Number</label><input value={form.gst_number} onChange={e => setField('gst_number', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Billing Address</label><textarea rows={2} value={form.billing_address} onChange={e => setField('billing_address', e.target.value)} /></div>

          {/* Bill item details */}
          <h4 className="form-section-title">Bill Item Details</h4>
          <div className="invoice-items-table">
            <table className="table-mini">
              <thead>
                <tr>
                  <th>Product/Service</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th>
                  <th>Unit Cost</th><th>Disc %</th><th>Tax %</th><th>Line Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={it._key}>
                    <td><input value={it.product_service} onChange={e => setItem(it._key, 'product_service', e.target.value)} placeholder="Item / service name" /></td>
                    <td><input value={it.hsn_sac_code} onChange={e => setItem(it._key, 'hsn_sac_code', e.target.value)} style={{ width: 80 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.quantity} onChange={e => setItem(it._key, 'quantity', e.target.value)} style={{ width: 64 }} /></td>
                    <td><input value={it.unit} onChange={e => setItem(it._key, 'unit', e.target.value)} style={{ width: 64 }} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.unit_cost} onChange={e => setItem(it._key, 'unit_cost', e.target.value)} style={{ width: 90 }} /></td>
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
          <div className="form-row">
            <div className="form-group"><label>Payment Status</label>
              <select value={form.payment_status} onChange={e => setField('payment_status', e.target.value)}>
                <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
              </select>
            </div>
            <div className="form-group"><label>Last Payment Date</label><input type="date" value={form.last_payment_date} onChange={e => setField('last_payment_date', e.target.value)} /></div>
          </div>

          {/* Attachments */}
          <h4 className="form-section-title">Attachments</h4>
          <div className="form-group"><label>Bill Attachment (URL)</label><input value={form.bill_attachment} onChange={e => setField('bill_attachment', e.target.value)} placeholder="Link to uploaded bill/invoice file" /></div>
          <div className="form-group"><label>Terms &amp; Conditions</label><textarea rows={2} value={form.terms_conditions} onChange={e => setField('terms_conditions', e.target.value)} /></div>
          <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} /></div>
          <div className="form-group"><label>Internal Notes (staff only)</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} /></div>

          {/* System fields */}
          <h4 className="form-section-title">System Fields</h4>
          <div className="form-row">
            <div className="form-group"><label>Created By</label><input value={form.created_by} onChange={e => setField('created_by', e.target.value)} /></div>
            <div className="form-group"><label>Approved By</label><input value={form.approved_by} onChange={e => setField('approved_by', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Approved Date</label><input type="date" style={{ maxWidth: 200 }} value={form.approved_date} onChange={e => setField('approved_date', e.target.value)} /></div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Bills;
