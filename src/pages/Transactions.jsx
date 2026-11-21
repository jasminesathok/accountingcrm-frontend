import { useState, useEffect, useCallback } from 'react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { getClients } from '../api/clients';
import { getVendors } from '../api/vendors';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { validatePhone } from '../utils/validators';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  // Basic information
  transaction_number: '', type: 'income', date: '', voucher_number: '', reference_number: '',
  status: 'completed', currency: 'INR',
  // Account information
  account_id: '', debit_account_id: '', credit_account_id: '', account_category: '', bank_account_id: '',
  // Party information
  party_type: '', client_id: '', vendor_id: '', party_name: '', contact_person: '', mobile_number: '', email_address: '',
  // Transaction details
  description: '', amount: '', tax_amount: '', discount: '', total_amount: '',
  // Payment details
  payment_method: '', payment_mode: '', gateway_transaction_id: '', bank_name: '',
  payment_account_number: '', cheque_number: '', upi_id: '',
  // Attachments
  receipt_upload: '', invoice_bill_attachment: '', supporting_documents: '',
  // Notes
  remarks: '', internal_notes: ''
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransactions({ search, page, limit });
      setTransactions(res.data.rows); setTotal(res.data.total);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const [accRes, bankRes, clientRes, vendorRes] = await Promise.all([
          getAccounts(),
          api.get('/bank-accounts'),
          getClients({ limit: 1000 }),
          getVendors({ limit: 1000 })
        ]);
        setAccounts(accRes.data || []);
        setBankAccounts(bankRes.data || []);
        setClients(clientRes.data.rows || []);
        setVendors(vendorRes.data.rows || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const clientLabel = (c) => c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
  const vendorLabel = (v) => v.company_name || v.name;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true); };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      transaction_number: t.transaction_number || '', type: t.type || 'income', date: t.date?.split('T')[0] || '',
      voucher_number: t.voucher_number || '', reference_number: t.reference_number || '',
      status: t.status || 'completed', currency: t.currency || 'INR',
      account_id: t.account_id || '', debit_account_id: t.debit_account_id || '', credit_account_id: t.credit_account_id || '',
      account_category: t.account_category || '', bank_account_id: t.bank_account_id || '',
      party_type: t.party_type || '', client_id: t.client_id || '', vendor_id: t.vendor_id || '',
      party_name: t.party_name || '', contact_person: t.contact_person || '', mobile_number: t.mobile_number || '',
      email_address: t.email_address || '',
      description: t.description || '', amount: t.amount ?? '', tax_amount: t.tax_amount ?? '',
      discount: t.discount ?? '', total_amount: t.total_amount ?? '',
      payment_method: t.payment_method || '', payment_mode: t.payment_mode || '', gateway_transaction_id: t.gateway_transaction_id || '',
      bank_name: t.bank_name || '', payment_account_number: t.payment_account_number || '', cheque_number: t.cheque_number || '',
      upi_id: t.upi_id || '',
      receipt_upload: t.receipt_upload || '', invoice_bill_attachment: t.invoice_bill_attachment || '', supporting_documents: t.supporting_documents || '',
      remarks: t.remarks || '', internal_notes: t.internal_notes || ''
    });
    setErrors({});
    setModal(true);
  };

  const validateField = (field, value) => {
    const check = validatePhone(value);
    setErrors(prev => ({ ...prev, [field]: check.valid ? '' : check.message }));
    return check.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneCheck = validatePhone(form.mobile_number);
    if (!phoneCheck.valid) { setErrors({ mobile_number: phoneCheck.message }); return; }

    const payload = { ...form };
    ['account_id', 'debit_account_id', 'credit_account_id', 'bank_account_id', 'client_id', 'vendor_id'].forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    setSaving(true);
    try {
      if (editing) await updateTransaction(editing.id, payload);
      else await createTransaction(payload);
      setModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await deleteTransaction(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'transaction_number', label: 'Txn #', render: (v, r) => v || `TXN-${String(r.id).padStart(6, '0')}` },
    { key: 'type', label: 'Type', badge: true },
    { key: 'amount', label: 'Amount', render: (v, r) => <span className={r.type === 'income' ? 'text-green' : 'text-red'}>{fmt(v)}</span> },
    { key: 'total_amount', label: 'Total', render: (v) => fmt(v) },
    { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'account_name', label: 'Chart of Account', render: (v) => v || '—' },
    { key: 'party_name', label: 'Client/Vendor', render: (v) => v || '—' },
    { key: 'payment_method', label: 'Payment', render: (v) => v || '—' },
    { key: 'status', label: 'Status', badge: true },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Transactions" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search transactions..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <span className="toolbar-count">{total} transactions</span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Transaction</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={transactions} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Transaction' : 'Add Transaction'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Transaction Number</label>
              <input placeholder="Auto if left blank" value={form.transaction_number} onChange={e => setField('transaction_number', e.target.value)} />
            </div>
            <div className="form-group"><label>Transaction Type</label>
              <select value={form.type} onChange={e => setField('type', e.target.value)} required>
                <option value="income">Income</option><option value="expense">Expense</option>
                <option value="transfer">Transfer</option><option value="journal">Journal</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Transaction Date</label><input type="date" value={form.date} onChange={e => setField('date', e.target.value)} required /></div>
            <div className="form-group"><label>Voucher Number</label><input value={form.voucher_number} onChange={e => setField('voucher_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reference Number</label><input placeholder="Invoice/Bill/Payment reference" value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Account information */}
          <h4 className="form-section-title">Account Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Chart of Account</label>
              <select value={form.account_id} onChange={e => {
                const id = e.target.value; setField('account_id', id);
                const acc = accounts.find(a => String(a.id) === String(id));
                if (acc) setField('account_category', acc.type);
              }}>
                <option value="">None</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
            <div className="form-group"><label>Account Category</label>
              <select value={form.account_category} onChange={e => setField('account_category', e.target.value)}>
                <option value="">None</option>
                <option value="Asset">Asset</option><option value="Liability">Liability</option>
                <option value="Equity">Equity</option><option value="Income">Income</option><option value="Expense">Expense</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Debit Account</label>
              <select value={form.debit_account_id} onChange={e => setField('debit_account_id', e.target.value)}>
                <option value="">None</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Credit Account</label>
              <select value={form.credit_account_id} onChange={e => setField('credit_account_id', e.target.value)}>
                <option value="">None</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Bank Account</label>
            <select value={form.bank_account_id} onChange={e => setField('bank_account_id', e.target.value)}>
              <option value="">None</option>
              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name} — {b.bank_name}</option>)}
            </select>
          </div>

          {/* Party information */}
          <h4 className="form-section-title">Party Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Party Type</label>
              <select value={form.party_type} onChange={e => { setField('party_type', e.target.value); setField('client_id', ''); setField('vendor_id', ''); }}>
                <option value="">None</option>
                <option value="client">Client</option><option value="vendor">Vendor</option><option value="other">Other</option>
              </select>
            </div>
            {form.party_type === 'client' && (
              <div className="form-group"><label>Client</label>
                <select value={form.client_id} onChange={e => {
                  const id = e.target.value; setField('client_id', id);
                  const c = clients.find(x => String(x.id) === String(id));
                  if (c) { setField('party_name', clientLabel(c)); setField('contact_person', c.contact_person || ''); setField('mobile_number', c.phone || ''); setField('email_address', c.email || ''); }
                }}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
                </select>
              </div>
            )}
            {form.party_type === 'vendor' && (
              <div className="form-group"><label>Vendor</label>
                <select value={form.vendor_id} onChange={e => {
                  const id = e.target.value; setField('vendor_id', id);
                  const v = vendors.find(x => String(x.id) === String(id));
                  if (v) { setField('party_name', vendorLabel(v)); setField('contact_person', v.contact_person || ''); setField('mobile_number', v.phone || ''); setField('email_address', v.email || ''); }
                }}>
                  <option value="">Select vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}
                </select>
              </div>
            )}
            {form.party_type === 'other' && (
              <div className="form-group"><label>Client/Vendor Name</label><input value={form.party_name} onChange={e => setField('party_name', e.target.value)} /></div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                className={errors.mobile_number ? 'input-invalid' : ''}
                value={form.mobile_number}
                onChange={e => setField('mobile_number', e.target.value)}
                onBlur={e => validateField('mobile_number', e.target.value)}
              />
              {errors.mobile_number && <span className="field-error">{errors.mobile_number}</span>}
            </div>
            <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>
          </div>

          {/* Transaction details */}
          <h4 className="form-section-title">Transaction Details</h4>
          <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setField('description', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Amount (₹)</label><input type="number" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} required /></div>
            <div className="form-group"><label>Tax Amount (₹)</label><input type="number" step="0.01" value={form.tax_amount} onChange={e => setField('tax_amount', e.target.value)} /></div>
            <div className="form-group"><label>Discount (₹)</label><input type="number" step="0.01" value={form.discount} onChange={e => setField('discount', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Total Amount (₹)</label>
            <input type="number" step="0.01" placeholder="Auto = Amount + Tax − Discount" value={form.total_amount} onChange={e => setField('total_amount', e.target.value)} />
          </div>

          {/* Payment details */}
          <h4 className="form-section-title">Payment Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)}>
                <option value="">None</option>
                <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option>
                <option value="card">Card</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group"><label>Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setField('payment_mode', e.target.value)}>
                <option value="">None</option>
                <option value="online">Online</option><option value="offline">Offline</option>
              </select>
            </div>
            <div className="form-group"><label>Gateway Transaction ID</label><input value={form.gateway_transaction_id} onChange={e => setField('gateway_transaction_id', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
            <div className="form-group"><label>Account Number</label><input value={form.payment_account_number} onChange={e => setField('payment_account_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Cheque Number</label><input value={form.cheque_number} onChange={e => setField('cheque_number', e.target.value)} /></div>
            <div className="form-group"><label>UPI ID</label><input value={form.upi_id} onChange={e => setField('upi_id', e.target.value)} /></div>
          </div>

          {/* Attachments */}
          <h4 className="form-section-title">Attachments</h4>
          <div className="form-row">
            <div className="form-group"><label>Receipt Upload</label><input placeholder="Receipt file URL" value={form.receipt_upload} onChange={e => setField('receipt_upload', e.target.value)} /></div>
            <div className="form-group"><label>Invoice/Bill Attachment</label><input placeholder="Invoice/Bill file URL" value={form.invoice_bill_attachment} onChange={e => setField('invoice_bill_attachment', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Supporting Documents</label><input placeholder="Additional document URL" value={form.supporting_documents} onChange={e => setField('supporting_documents', e.target.value)} /></div>

          {/* Notes */}
          <h4 className="form-section-title">Notes</h4>
          <div className="form-group"><label>Remarks</label><textarea rows={2} value={form.remarks} onChange={e => setField('remarks', e.target.value)} /></div>
          <div className="form-group"><label>Internal Notes</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} placeholder="Staff-only notes" /></div>

          {editing && (
            <>
              <h4 className="form-section-title">System Information</h4>
              <div className="system-fields-readonly">
                <span>Created By: {editing.created_by || '—'}</span>
                <span>Created Date: {editing.created_at ? new Date(editing.created_at).toLocaleString() : '—'}</span>
                <span>Updated By: {editing.updated_by || '—'}</span>
                <span>Last Modified: {editing.updated_at ? new Date(editing.updated_at).toLocaleString() : '—'}</span>
                <span>Approved By: {editing.approved_by || '—'}</span>
                <span>Approval Date: {editing.approval_date ? new Date(editing.approval_date).toLocaleString() : '—'}</span>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;
