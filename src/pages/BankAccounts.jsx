import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { validateAccountNumber } from '../utils/validators';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  // Basic information
  account_code: '', bank_name: '', account_name: '', account_number: '',
  account_type: 'savings', branch_name: '', ifsc_code: '', swift_code: '', micr_code: '',
  currency: 'INR', balance: '', opening_balance: '', status: 'active',
  // Bank details
  bank_address: '', city: '', state: '', country: '', pin_code: '', upi_id: '',
  // Transaction details
  transaction_id: '', transaction_date: '', transaction_type: '', reference_number: '',
  description: '', debit_amount: '', credit_amount: '', available_balance: '',
  // Reconciliation details
  reconciliation_status: 'pending', statement_date: '', reconciled_by: '', reconciliation_date: '',
  // Attachments
  bank_statement: '', cancelled_cheque: '', other_documents: '',
  // Notes
  remarks: '', internal_notes: ''
};

const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/bank-accounts'); setAccounts(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true); };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      account_code: a.account_code || '', bank_name: a.bank_name || '', account_name: a.account_name || '',
      account_number: a.account_number || '', account_type: a.account_type || 'savings',
      branch_name: a.branch_name || '', ifsc_code: a.ifsc_code || '', swift_code: a.swift_code || '', micr_code: a.micr_code || '',
      currency: a.currency || 'INR', balance: a.balance ?? '', opening_balance: a.opening_balance ?? '', status: a.status || 'active',
      bank_address: a.bank_address || '', city: a.city || '', state: a.state || '', country: a.country || '',
      pin_code: a.pin_code || '', upi_id: a.upi_id || '',
      transaction_id: a.transaction_id || '', transaction_date: a.transaction_date?.split('T')[0] || '',
      transaction_type: a.transaction_type || '', reference_number: a.reference_number || '',
      description: a.description || '', debit_amount: a.debit_amount ?? '', credit_amount: a.credit_amount ?? '',
      available_balance: a.available_balance ?? '',
      reconciliation_status: a.reconciliation_status || 'pending', statement_date: a.statement_date?.split('T')[0] || '',
      reconciled_by: a.reconciled_by || '', reconciliation_date: a.reconciliation_date?.split('T')[0] || '',
      bank_statement: a.bank_statement || '', cancelled_cheque: a.cancelled_cheque || '', other_documents: a.other_documents || '',
      remarks: a.remarks || '', internal_notes: a.internal_notes || ''
    });
    setErrors({});
    setModal(true);
  };

  const validateField = (field, value) => {
    const check = validateAccountNumber(value);
    setErrors(prev => ({ ...prev, [field]: check.valid ? '' : check.message }));
    return check.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const accCheck = validateAccountNumber(form.account_number);
    if (!accCheck.valid) {
      setErrors({ account_number: accCheck.message });
      return;
    }

    setSaving(true);
    try {
      if (editing) await api.put(`/bank-accounts/${editing.id}`, form);
      else await api.post('/bank-accounts', form);
      setModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bank account?')) return;
    try { await api.delete(`/bank-accounts/${id}`); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'account_code', label: 'Code', render: (v, r) => v || `BANK-${String(r.id).padStart(5, '0')}` },
    { key: 'account_name', label: 'Account Name' },
    { key: 'bank_name', label: 'Bank' },
    { key: 'account_number', label: 'Account Number' },
    { key: 'account_type', label: 'Type', badge: true },
    { key: 'balance', label: 'Current Balance', render: (v) => fmt(v) },
    { key: 'status', label: 'Status', badge: true },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  return (
    <div className="page">
      <Navbar title="Bank Accounts" />
      <div className="page-content">
        <div className="bank-summary-bar">
          <span>Total Balance: <strong className="text-green">{fmt(totalBalance)}</strong></span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Account</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={accounts} loading={loading} page={1} totalPages={1} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Bank Account' : 'Add Bank Account'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Account Code</label>
              <input placeholder="Auto if left blank" value={form.account_code} onChange={e => setField('account_code', e.target.value)} />
            </div>
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Name</label><input value={form.account_name} onChange={e => setField('account_name', e.target.value)} required /></div>
            <div className="form-group">
              <label>Account Number</label>
              <input
                className={errors.account_number ? 'input-invalid' : ''}
                placeholder="e.g. 123456789012"
                value={form.account_number}
                onChange={e => setField('account_number', e.target.value.replace(/\D/g, ''))}
                onBlur={e => validateField('account_number', e.target.value)}
                inputMode="numeric"
                maxLength={18}
                required
              />
              {errors.account_number && <span className="field-error">{errors.account_number}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Type</label>
              <select value={form.account_type} onChange={e => setField('account_type', e.target.value)}>
                <option value="savings">Savings</option><option value="current">Current</option>
                <option value="cash_credit">Cash Credit</option><option value="od">OD</option>
              </select>
            </div>
            <div className="form-group"><label>Branch Name</label><input value={form.branch_name} onChange={e => setField('branch_name', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>IFSC Code</label><input value={form.ifsc_code} onChange={e => setField('ifsc_code', e.target.value.toUpperCase())} /></div>
            <div className="form-group"><label>SWIFT Code</label><input value={form.swift_code} onChange={e => setField('swift_code', e.target.value.toUpperCase())} /></div>
            <div className="form-group"><label>MICR Code</label><input value={form.micr_code} onChange={e => setField('micr_code', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Opening Balance (₹)</label><input type="number" step="0.01" value={form.opening_balance} onChange={e => setField('opening_balance', e.target.value)} /></div>
            <div className="form-group"><label>Current Balance (₹)</label><input type="number" step="0.01" value={form.balance} onChange={e => setField('balance', e.target.value)} /></div>
          </div>

          {/* Bank details */}
          <h4 className="form-section-title">Bank Details</h4>
          <div className="form-group"><label>Bank Address</label><input value={form.bank_address} onChange={e => setField('bank_address', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>City</label><input value={form.city} onChange={e => setField('city', e.target.value)} /></div>
            <div className="form-group"><label>State</label><input value={form.state} onChange={e => setField('state', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Country</label><input value={form.country} onChange={e => setField('country', e.target.value)} /></div>
            <div className="form-group"><label>PIN Code</label><input value={form.pin_code} onChange={e => setField('pin_code', e.target.value)} /></div>
            <div className="form-group"><label>UPI ID</label><input value={form.upi_id} onChange={e => setField('upi_id', e.target.value)} /></div>
          </div>

          {/* Transaction details */}
          <h4 className="form-section-title">Transaction Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Transaction ID</label><input value={form.transaction_id} onChange={e => setField('transaction_id', e.target.value)} /></div>
            <div className="form-group"><label>Transaction Date</label><input type="date" value={form.transaction_date} onChange={e => setField('transaction_date', e.target.value)} /></div>
            <div className="form-group"><label>Transaction Type</label>
              <select value={form.transaction_type} onChange={e => setField('transaction_type', e.target.value)}>
                <option value="">None</option>
                <option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option><option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} /></div>
            <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setField('description', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Debit Amount</label><input type="number" step="0.01" value={form.debit_amount} onChange={e => setField('debit_amount', e.target.value)} /></div>
            <div className="form-group"><label>Credit Amount</label><input type="number" step="0.01" value={form.credit_amount} onChange={e => setField('credit_amount', e.target.value)} /></div>
            <div className="form-group"><label>Available Balance</label><input type="number" step="0.01" value={form.available_balance} onChange={e => setField('available_balance', e.target.value)} /></div>
          </div>

          {/* Reconciliation details */}
          <h4 className="form-section-title">Reconciliation Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Reconciliation Status</label>
              <select value={form.reconciliation_status} onChange={e => setField('reconciliation_status', e.target.value)}>
                <option value="pending">Pending</option><option value="reconciled">Reconciled</option>
              </select>
            </div>
            <div className="form-group"><label>Statement Date</label><input type="date" value={form.statement_date} onChange={e => setField('statement_date', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reconciled By</label><input value={form.reconciled_by} onChange={e => setField('reconciled_by', e.target.value)} /></div>
            <div className="form-group"><label>Reconciliation Date</label><input type="date" value={form.reconciliation_date} onChange={e => setField('reconciliation_date', e.target.value)} /></div>
          </div>

          {/* Attachments */}
          <h4 className="form-section-title">Attachments</h4>
          <div className="form-row">
            <div className="form-group"><label>Bank Statement</label><input value={form.bank_statement} onChange={e => setField('bank_statement', e.target.value)} placeholder="Statement file URL" /></div>
            <div className="form-group"><label>Cancelled Cheque</label><input value={form.cancelled_cheque} onChange={e => setField('cancelled_cheque', e.target.value)} placeholder="Cancelled cheque URL" /></div>
          </div>
          <div className="form-group"><label>Other Documents</label><input value={form.other_documents} onChange={e => setField('other_documents', e.target.value)} placeholder="Supporting document URL" /></div>

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

export default BankAccounts;
