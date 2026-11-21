import { useState, useEffect, useCallback, useMemo } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses';
import { getVendors } from '../api/vendors';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const num = (v) => Number(v) || 0;
const CATEGORIES = ['Travel', 'Office', 'Utility', 'Salary', 'Rent', 'Marketing', 'Software', 'Miscellaneous'];

const EMPTY = {
  vendor_id: '',
  // Basic information
  expense_number: '', date: new Date().toISOString().split('T')[0], category: '',
  expense_type: 'business', status: 'pending', reference_number: '', currency: 'INR',
  // Vendor / Payee information
  payee_name: '', contact_person: '', mobile_number: '', email_address: '',
  // Expense details
  expense_name: '', description: '', quantity: 1, unit_cost: '', tax_percent: 0, discount: 0,
  // Tax details
  gst_number: '', gst_type: '',
  // Payment details
  payment_method: '', payment_mode: 'offline', payment_status: 'unpaid',
  paid_amount: 0, transaction_id: '', bank_name: '', account_name: '', cheque_number: '',
  // Attachments & notes
  receipt_upload: '', bill_attachment: '', notes: '', internal_notes: '',
  // Approval details
  submitted_by: '', approved_by: '', approval_status: 'pending', approval_date: ''
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, v] = await Promise.all([getExpenses({ search, page, limit }), getVendors({ limit: 100 })]);
      setExpenses(e.data.rows); setTotal(e.data.total); setVendors(v.data.rows);
    } catch (ex) { console.error(ex); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };

  const openEdit = (ex) => {
    setEditing(ex);
    setForm({
      vendor_id: ex.vendor_id || '',
      expense_number: ex.expense_number || '', date: ex.date?.split('T')[0] || '', category: ex.category || '',
      expense_type: ex.expense_type || 'business', status: ex.status || 'pending',
      reference_number: ex.reference_number || '', currency: ex.currency || 'INR',
      payee_name: ex.payee_name || '', contact_person: ex.contact_person || '',
      mobile_number: ex.mobile_number || '', email_address: ex.email_address || '',
      expense_name: ex.expense_name || '', description: ex.description || '',
      quantity: ex.quantity ?? 1, unit_cost: ex.unit_cost ?? '', tax_percent: ex.tax_percent ?? 0, discount: ex.discount ?? 0,
      gst_number: ex.gst_number || '', gst_type: ex.gst_type || '',
      payment_method: ex.payment_method || '', payment_mode: ex.payment_mode || 'offline',
      payment_status: ex.payment_status || 'unpaid', paid_amount: ex.paid_amount ?? 0,
      transaction_id: ex.transaction_id || '', bank_name: ex.bank_name || '',
      account_name: ex.account_name || '', cheque_number: ex.cheque_number || '',
      receipt_upload: ex.receipt_upload || '', bill_attachment: ex.bill_attachment || '',
      notes: ex.notes || '', internal_notes: ex.internal_notes || '',
      submitted_by: ex.submitted_by || '', approved_by: ex.approved_by || '',
      approval_status: ex.approval_status || 'pending', approval_date: ex.approval_date?.split('T')[0] || ''
    });
    setError('');
    setModal(true);
  };

  // Live client-side preview of totals; the server is authoritative on save.
  const totals = useMemo(() => {
    const gross = num(form.quantity) * num(form.unit_cost);
    const taxableAmount = gross - num(form.discount);
    const taxAmount = taxableAmount * (num(form.tax_percent) / 100);
    const grandTotal = taxableAmount + taxAmount;
    const balanceAmount = grandTotal - num(form.paid_amount);
    return { taxableAmount, taxAmount, grandTotal, balanceAmount };
  }, [form.quantity, form.unit_cost, form.discount, form.tax_percent, form.paid_amount]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        vendor_id: form.vendor_id || null,
        amount: totals.grandTotal || num(form.unit_cost) || 0,
        tax_amount: totals.taxAmount,
        taxable_amount: totals.taxableAmount,
        total_tax: totals.taxAmount,
        balance_amount: totals.balanceAmount
      };
      if (editing) await updateExpense(editing.id, payload); else await createExpense(payload);
      setModal(false); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await deleteExpense(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'expense_number', label: 'Expense #', render: (v, r) => v || `EXP-${String(r.id).padStart(5, '0')}` },
    { key: 'category', label: 'Category' },
    { key: 'vendor_name', label: 'Vendor/Payee', render: (v, r) => v || r.payee_name || '—' },
    { key: 'amount', label: 'Total Amount', render: (v) => fmt(v) },
    { key: 'status', label: 'Status', badge: true },
    { key: 'payment_status', label: 'Payment', badge: true },
    { key: 'date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Expenses" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Expense</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={expenses} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Expense Number</label>
              <input placeholder="Auto if left blank" value={form.expense_number} onChange={e => setField('expense_number', e.target.value)} />
            </div>
            <div className="form-group"><label>Expense Date</label><input type="date" value={form.date} onChange={e => setField('date', e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Expense Category</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)} required>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Expense Type</label>
              <select value={form.expense_type} onChange={e => setField('expense_type', e.target.value)}>
                <option value="business">Business</option><option value="personal">Personal</option><option value="operational">Operational</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Expense Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="pending">Pending</option><option value="approved">Approved</option>
                <option value="rejected">Rejected</option><option value="paid">Paid</option>
              </select>
            </div>
            <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} placeholder="Bill / Receipt reference" /></div>
          </div>
          <div className="form-group"><label>Currency</label>
            <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
              <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </select>
          </div>

          {/* Vendor / Payee information */}
          <h4 className="form-section-title">Vendor / Payee Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Vendor (optional)</label>
              <select value={form.vendor_id} onChange={e => setField('vendor_id', e.target.value)}>
                <option value="">None</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Vendor / Payee Name</label><input value={form.payee_name} onChange={e => setField('payee_name', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group"><label>Mobile Number</label><input value={form.mobile_number} onChange={e => setField('mobile_number', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>

          {/* Expense details */}
          <h4 className="form-section-title">Expense Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Expense Name</label><input value={form.expense_name} onChange={e => setField('expense_name', e.target.value)} /></div>
            <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setField('description', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Quantity</label><input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setField('quantity', e.target.value)} /></div>
            <div className="form-group"><label>Unit Cost</label><input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setField('unit_cost', e.target.value)} required /></div>
            <div className="form-group"><label>Discount</label><input type="number" min="0" step="0.01" value={form.discount} onChange={e => setField('discount', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Tax (%)</label><input type="number" min="0" step="0.01" value={form.tax_percent} onChange={e => setField('tax_percent', e.target.value)} /></div>
            <div className="form-group"><label>Tax Amount</label><input value={fmt(totals.taxAmount)} readOnly /></div>
            <div className="form-group"><label>Total Amount</label><input value={fmt(totals.grandTotal)} readOnly /></div>
          </div>

          {/* Tax details */}
          <h4 className="form-section-title">Tax Details</h4>
          <div className="form-row">
            <div className="form-group"><label>GST Number</label><input value={form.gst_number} onChange={e => setField('gst_number', e.target.value)} /></div>
            <div className="form-group"><label>GST Type</label>
              <select value={form.gst_type} onChange={e => setField('gst_type', e.target.value)}>
                <option value="">None</option><option value="cgst">CGST</option><option value="sgst">SGST</option><option value="igst">IGST</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Taxable Amount</label><input value={fmt(totals.taxableAmount)} readOnly /></div>
            <div className="form-group"><label>Total Tax</label><input value={fmt(totals.taxAmount)} readOnly /></div>
          </div>

          {/* Payment details */}
          <h4 className="form-section-title">Payment Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)}>
                <option value="">Select method...</option>
                <option value="cash">Cash</option><option value="bank">Bank</option>
                <option value="upi">UPI</option><option value="card">Card</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group"><label>Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setField('payment_mode', e.target.value)}>
                <option value="online">Online</option><option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Payment Status</label>
              <select value={form.payment_status} onChange={e => setField('payment_status', e.target.value)}>
                <option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option>
              </select>
            </div>
            <div className="form-group"><label>Paid Amount</label><input type="number" step="0.01" value={form.paid_amount} onChange={e => setField('paid_amount', e.target.value)} /></div>
            <div className="form-group"><label>Balance Amount</label><input value={fmt(totals.balanceAmount)} readOnly /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Transaction ID</label><input value={form.transaction_id} onChange={e => setField('transaction_id', e.target.value)} /></div>
          </div>
          {form.payment_method === 'cheque' && (
            <div className="form-row">
              <div className="form-group"><label>Cheque Number</label><input value={form.cheque_number} onChange={e => setField('cheque_number', e.target.value)} /></div>
              <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
            </div>
          )}
          {form.payment_method === 'bank' && (
            <div className="form-row">
              <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
              <div className="form-group"><label>Account Name</label><input value={form.account_name} onChange={e => setField('account_name', e.target.value)} /></div>
            </div>
          )}

          {/* Attachments & notes */}
          <h4 className="form-section-title">Attachments & Notes</h4>
          <div className="form-row">
            <div className="form-group"><label>Receipt Upload</label><input value={form.receipt_upload} onChange={e => setField('receipt_upload', e.target.value)} placeholder="Receipt / invoice URL" /></div>
            <div className="form-group"><label>Bill Attachment</label><input value={form.bill_attachment} onChange={e => setField('bill_attachment', e.target.value)} placeholder="Supporting bill URL" /></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} /></div>
          <div className="form-group"><label>Internal Notes</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} placeholder="Staff-only notes" /></div>

          {/* Approval details */}
          <h4 className="form-section-title">Approval Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Submitted By</label><input value={form.submitted_by} onChange={e => setField('submitted_by', e.target.value)} /></div>
            <div className="form-group"><label>Approved By</label><input value={form.approved_by} onChange={e => setField('approved_by', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Approval Status</label>
              <select value={form.approval_status} onChange={e => setField('approval_status', e.target.value)}>
                <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="form-group"><label>Approval Date</label><input type="date" value={form.approval_date} onChange={e => setField('approval_date', e.target.value)} /></div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
