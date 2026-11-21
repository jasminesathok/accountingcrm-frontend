import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  // Basic information
  petty_cash_code: '', voucher_number: '', transaction_date: '', transaction_type: 'payment',
  expense_category: '', amount: '', currency: 'INR', status: 'pending',
  // Payee / Received From details
  payee_name: '', department: '', contact_number: '', purpose: '',
  // Transaction details
  description: '', payment_method: 'cash', reference_number: '', receipt_number: '', bill_number: '',
  amount_received: '', amount_paid: '', balance_amount: '',
  // Approval details
  requested_by: '', approved_by: '', approval_status: 'pending', approval_date: '',
  // Attachments
  receipt_upload: '', bill_attachment: '', supporting_documents: '',
  // Notes
  remarks: '', internal_notes: ''
};

const PettyCash = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/petty-cash'); setEntries(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true); };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      petty_cash_code: e.petty_cash_code || '', voucher_number: e.voucher_number || '',
      transaction_date: e.transaction_date?.split('T')[0] || '', transaction_type: e.transaction_type || 'payment',
      expense_category: e.expense_category || '', amount: e.amount ?? '', currency: e.currency || 'INR',
      status: e.status || 'pending',
      payee_name: e.payee_name || '', department: e.department || '', contact_number: e.contact_number || '', purpose: e.purpose || '',
      description: e.description || '', payment_method: e.payment_method || 'cash', reference_number: e.reference_number || '',
      receipt_number: e.receipt_number || '', bill_number: e.bill_number || '',
      amount_received: e.amount_received ?? '', amount_paid: e.amount_paid ?? '', balance_amount: e.balance_amount ?? '',
      requested_by: e.requested_by || '', approved_by: e.approved_by || '', approval_status: e.approval_status || 'pending',
      approval_date: e.approval_date?.split('T')[0] || '',
      receipt_upload: e.receipt_upload || '', bill_attachment: e.bill_attachment || '', supporting_documents: e.supporting_documents || '',
      remarks: e.remarks || '', internal_notes: e.internal_notes || ''
    });
    setErrors({});
    setModal(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (!form.voucher_number.trim()) {
      setErrors({ voucher_number: 'Voucher number is required' });
      return;
    }
    if (form.amount === '' || parseFloat(form.amount) < 0) {
      setErrors({ amount: 'Enter a valid amount' });
      return;
    }

    setSaving(true);
    try {
      if (editing) await api.put(`/petty-cash/${editing.id}`, form);
      else await api.post('/petty-cash', form);
      setModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this petty cash entry?')) return;
    try { await api.delete(`/petty-cash/${id}`); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'petty_cash_code', label: 'Code', render: (v, r) => v || `PC-${String(r.id).padStart(5, '0')}` },
    { key: 'voucher_number', label: 'Voucher No.' },
    { key: 'transaction_date', label: 'Date', render: (v) => v ? v.split('T')[0] : '-' },
    { key: 'transaction_type', label: 'Type', badge: true },
    { key: 'expense_category', label: 'Category' },
    { key: 'payee_name', label: 'Employee/Vendor' },
    { key: 'amount', label: 'Amount', render: (v) => fmt(v) },
    { key: 'status', label: 'Status', badge: true },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const totalBalance = entries.reduce((s, e) => s + parseFloat(e.balance_amount || 0), 0);

  return (
    <div className="page">
      <Navbar title="Petty Cash" />
      <div className="page-content">
        <div className="bank-summary-bar">
          <span>Total Balance: <strong className="text-green">{fmt(totalBalance)}</strong></span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Entry</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={entries} loading={loading} page={1} totalPages={1} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Petty Cash Entry' : 'Add Petty Cash Entry'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Petty Cash ID</label>
              <input placeholder="Auto if left blank" value={form.petty_cash_code} onChange={e => setField('petty_cash_code', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Voucher Number</label>
              <input
                className={errors.voucher_number ? 'input-invalid' : ''}
                value={form.voucher_number}
                onChange={e => setField('voucher_number', e.target.value)}
                required
              />
              {errors.voucher_number && <span className="field-error">{errors.voucher_number}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Transaction Date</label><input type="date" value={form.transaction_date} onChange={e => setField('transaction_date', e.target.value)} /></div>
            <div className="form-group"><label>Transaction Type</label>
              <select value={form.transaction_type} onChange={e => setField('transaction_type', e.target.value)}>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Expense Category</label>
              <input placeholder="Office, Travel, Refreshments, Stationery, etc." value={form.expense_category} onChange={e => setField('expense_category', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number" step="0.01"
                className={errors.amount ? 'input-invalid' : ''}
                value={form.amount}
                onChange={e => setField('amount', e.target.value)}
                required
              />
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Payee / Received From details */}
          <h4 className="form-section-title">Payee / Received From Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Employee/Vendor Name</label><input value={form.payee_name} onChange={e => setField('payee_name', e.target.value)} /></div>
            <div className="form-group"><label>Department</label><input value={form.department} onChange={e => setField('department', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Contact Number</label><input value={form.contact_number} onChange={e => setField('contact_number', e.target.value)} /></div>
            <div className="form-group"><label>Purpose</label><input value={form.purpose} onChange={e => setField('purpose', e.target.value)} /></div>
          </div>

          {/* Transaction details */}
          <h4 className="form-section-title">Transaction Details</h4>
          <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setField('description', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Payment Method</label><input value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} /></div>
            <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Receipt Number</label><input value={form.receipt_number} onChange={e => setField('receipt_number', e.target.value)} /></div>
            <div className="form-group"><label>Bill Number</label><input value={form.bill_number} onChange={e => setField('bill_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Amount Received</label><input type="number" step="0.01" value={form.amount_received} onChange={e => setField('amount_received', e.target.value)} /></div>
            <div className="form-group"><label>Amount Paid</label><input type="number" step="0.01" value={form.amount_paid} onChange={e => setField('amount_paid', e.target.value)} /></div>
            <div className="form-group"><label>Balance Amount</label><input placeholder="Auto if left blank" type="number" step="0.01" value={form.balance_amount} onChange={e => setField('balance_amount', e.target.value)} /></div>
          </div>

          {/* Approval details */}
          <h4 className="form-section-title">Approval Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Requested By</label><input value={form.requested_by} onChange={e => setField('requested_by', e.target.value)} /></div>
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

          {/* Attachments */}
          <h4 className="form-section-title">Attachments</h4>
          <div className="form-row">
            <div className="form-group"><label>Receipt Upload</label><input value={form.receipt_upload} onChange={e => setField('receipt_upload', e.target.value)} placeholder="Receipt file URL" /></div>
            <div className="form-group"><label>Bill Attachment</label><input value={form.bill_attachment} onChange={e => setField('bill_attachment', e.target.value)} placeholder="Bill/invoice file URL" /></div>
          </div>
          <div className="form-group"><label>Supporting Documents</label><input value={form.supporting_documents} onChange={e => setField('supporting_documents', e.target.value)} placeholder="Additional document URL" /></div>

          {/* Notes */}
          <h4 className="form-section-title">Notes</h4>
          <div className="form-group"><label>Remarks</label><textarea rows={2} value={form.remarks} onChange={e => setField('remarks', e.target.value)} /></div>
          <div className="form-group"><label>Internal Notes</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} placeholder="Staff-only notes" /></div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PettyCash;
