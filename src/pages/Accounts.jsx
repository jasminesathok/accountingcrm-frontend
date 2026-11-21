import { useState, useEffect, useCallback } from 'react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api/accounts';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  // Basic information
  code: '', name: '', type: 'Asset', account_category: '', parent_account_id: '',
  account_level: 'Main Account', currency: 'INR', opening_balance: '', status: 'Active',
  // Financial information
  budget_amount: '', actual_amount: '', credit_limit: '',
  // Account details
  account_description: '', normal_balance: '', reconciliation_required: false,
  allow_manual_entry: true, tax_applicable: false, tax_code: '',
  // Bank account details (optional)
  bank_name: '', bank_branch_name: '', account_holder_name: '', bank_account_number: '',
  ifsc_code: '', swift_code: '', upi_id: '',
  // Notes / org filters
  remarks: '', branch: '', department: ''
};

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewAccount, setViewAccount] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccounts({ search: search || undefined, status: statusFilter || undefined });
      setAccounts(res.data);
    }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      code: a.code || '', name: a.name || '', type: a.type, account_category: a.account_category || '',
      parent_account_id: a.parent_account_id || '', account_level: a.account_level || 'Main Account',
      currency: a.currency || 'INR', opening_balance: a.opening_balance ?? '', status: a.status || 'Active',
      budget_amount: a.budget_amount ?? '', actual_amount: a.actual_amount ?? '', credit_limit: a.credit_limit ?? '',
      account_description: a.account_description || '', normal_balance: a.normal_balance || '',
      reconciliation_required: !!a.reconciliation_required, allow_manual_entry: a.allow_manual_entry !== false,
      tax_applicable: !!a.tax_applicable, tax_code: a.tax_code || '',
      bank_name: a.bank_name || '', bank_branch_name: a.bank_branch_name || '',
      account_holder_name: a.account_holder_name || '', bank_account_number: a.bank_account_number || '',
      ifsc_code: a.ifsc_code || '', swift_code: a.swift_code || '', upi_id: a.upi_id || '',
      remarks: a.remarks || '', branch: a.branch || '', department: a.department || ''
    });
    setError(''); setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (payload.parent_account_id === '') payload.parent_account_id = null;
      if (editing) await updateAccount(editing.id, payload); else await createAccount(payload);
      setModal(false); fetchAccounts();
    } catch (err) { setError(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try { await deleteAccount(id); fetchAccounts(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  // Group by type
  const grouped = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(type => ({
    type,
    items: accounts.filter(a => a.type === type),
    total: accounts.filter(a => a.type === type).reduce((s, a) => s + parseFloat(a.balance || 0), 0),
  }));

  const typeColors = { Asset: 'text-blue', Liability: 'text-red', Equity: 'text-purple', Income: 'text-green', Expense: 'text-orange' };

  const mainAccountOptions = accounts.filter(a => !editing || a.id !== editing.id);

  return (
    <div className="page">
      <Navbar title="Chart of Accounts" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search account name or code..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Account</button>
        </div>

        {grouped.map(({ type, items, total }) => (
          <div key={type} className="section-card" style={{ marginBottom: '1rem' }}>
            <div className="coa-group-header">
              <h3 className={`coa-type ${typeColors[type]}`}>{type} Accounts</h3>
              <span className="coa-total">{fmt(total)}</span>
            </div>
            <DataTable
              columns={[
                { key: 'code', label: 'Code', render: v => v || '—' },
                { key: 'name', label: 'Account Name' },
                { key: 'account_category', label: 'Category', render: v => v || '—' },
                { key: 'account_level', label: 'Level', render: v => v || 'Main Account' },
                { key: 'balance', label: 'Current Balance', render: (v) => fmt(v) },
                { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'Active'} /> },
                { key: 'actions', label: 'Actions', render: (_, r) => (
                  <div className="row-actions">
                    <button className="icon-btn-sm" title="View" onClick={() => setViewAccount(r)}><Eye size={14} /></button>
                    <button className="icon-btn-sm" title="Edit" onClick={() => openEdit(r)}><Pencil size={14} /></button>
                    <button className="icon-btn-sm danger" title="Delete" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                  </div>
                )},
              ]}
              data={items}
              loading={loading}
              page={1}
              totalPages={1}
            />
          </div>
        ))}
      </div>

      {/* ---------------- Create / Edit Account ---------------- */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Account' : 'Add Account'} size="lg">
        <form onSubmit={handleSubmit} className="modal-form">

          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Account Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Unique code" /></div>
            <div className="form-group"><label>Account Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
              </select>
            </div>
            <div className="form-group"><label>Account Category</label><input value={form.account_category} onChange={e => setForm({ ...form, account_category: e.target.value })} placeholder="Current Asset, Fixed Asset..." /></div>
            <div className="form-group"><label>Parent Account</label>
              <select value={form.parent_account_id} onChange={e => setForm({ ...form, parent_account_id: e.target.value })}>
                <option value="">— None (Main Account) —</option>
                {mainAccountOptions.map(a => <option key={a.id} value={a.id}>{a.code ? `${a.code} — ${a.name}` : a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Level</label>
              <select value={form.account_level} onChange={e => setForm({ ...form, account_level: e.target.value })}>
                <option value="Main Account">Main Account</option>
                <option value="Sub Account">Sub Account</option>
              </select>
            </div>
            <div className="form-group"><label>Currency</label><input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="INR" /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Opening Balance (₹)</label><input type="number" step="0.01" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} /></div>
            {editing && <div className="form-group"><label>Current Balance (₹)</label><input value={fmt(editing.balance)} disabled /></div>}
          </div>

          <h4 className="form-section-title">Financial Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Budget Amount</label><input type="number" step="0.01" value={form.budget_amount} onChange={e => setForm({ ...form, budget_amount: e.target.value })} /></div>
            <div className="form-group"><label>Actual Amount</label><input type="number" step="0.01" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: e.target.value })} /></div>
            <div className="form-group"><label>Credit Limit</label><input type="number" step="0.01" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} placeholder="If applicable" /></div>
          </div>

          <h4 className="form-section-title">Account Details</h4>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}><label>Account Description</label><textarea rows={2} value={form.account_description} onChange={e => setForm({ ...form, account_description: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Normal Balance</label>
              <select value={form.normal_balance} onChange={e => setForm({ ...form, normal_balance: e.target.value })}>
                <option value="">— Auto (from type) —</option>
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div className="form-group"><label>Tax Applicable</label>
              <select value={form.tax_applicable ? 'yes' : 'no'} onChange={e => setForm({ ...form, tax_applicable: e.target.value === 'yes' })}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select>
            </div>
            <div className="form-group"><label>Tax Code</label>
              <select value={form.tax_code} onChange={e => setForm({ ...form, tax_code: e.target.value })} disabled={!form.tax_applicable}>
                <option value="">— None —</option>
                <option value="GST">GST</option><option value="TDS">TDS</option><option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reconciliation Required</label>
              <select value={form.reconciliation_required ? 'yes' : 'no'} onChange={e => setForm({ ...form, reconciliation_required: e.target.value === 'yes' })}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select>
            </div>
            <div className="form-group"><label>Allow Manual Entry</label>
              <select value={form.allow_manual_entry ? 'yes' : 'no'} onChange={e => setForm({ ...form, allow_manual_entry: e.target.value === 'yes' })}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
          </div>

          <h4 className="form-section-title">Bank Account Details (optional)</h4>
          <div className="form-row">
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="form-group"><label>Branch Name</label><input value={form.bank_branch_name} onChange={e => setForm({ ...form, bank_branch_name: e.target.value })} /></div>
            <div className="form-group"><label>Account Holder Name</label><input value={form.account_holder_name} onChange={e => setForm({ ...form, account_holder_name: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Number</label><input value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} /></div>
            <div className="form-group"><label>IFSC Code</label><input value={form.ifsc_code} onChange={e => setForm({ ...form, ifsc_code: e.target.value })} /></div>
            <div className="form-group"><label>SWIFT Code</label><input value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })} placeholder="International" /></div>
            <div className="form-group"><label>UPI ID</label><input value={form.upi_id} onChange={e => setForm({ ...form, upi_id: e.target.value })} /></div>
          </div>

          <h4 className="form-section-title">Other</h4>
          <div className="form-row">
            <div className="form-group"><label>Branch</label><input value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} placeholder="Optional" /></div>
            <div className="form-group"><label>Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Optional" /></div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}><label>Remarks</label><textarea rows={2} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Additional notes" /></div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* ---------------- View Account ---------------- */}
      <Modal isOpen={!!viewAccount} onClose={() => setViewAccount(null)} title={viewAccount ? `${viewAccount.code ? viewAccount.code + ' — ' : ''}${viewAccount.name}` : ''} size="lg">
        {viewAccount && (
          <div className="modal-form">
            <h4 className="form-section-title">Basic Information</h4>
            <p><strong>Type:</strong> {viewAccount.type} &nbsp; <strong>Category:</strong> {viewAccount.account_category || '—'} &nbsp; <strong>Level:</strong> {viewAccount.account_level || 'Main Account'}</p>
            <p><strong>Parent Account:</strong> {viewAccount.ParentAccount ? `${viewAccount.ParentAccount.code || ''} ${viewAccount.ParentAccount.name}` : '—'} &nbsp; <strong>Currency:</strong> {viewAccount.currency || 'INR'} &nbsp; <strong>Status:</strong> <StatusBadge status={viewAccount.status || 'Active'} /></p>
            <p><strong>Opening Balance:</strong> {fmt(viewAccount.opening_balance)} &nbsp; <strong>Current Balance:</strong> {fmt(viewAccount.balance)}</p>

            <h4 className="form-section-title">Financial Information</h4>
            <p><strong>Budget Amount:</strong> {fmt(viewAccount.budget_amount)} &nbsp; <strong>Actual Amount:</strong> {fmt(viewAccount.actual_amount)}</p>
            <p><strong>Credit Limit:</strong> {fmt(viewAccount.credit_limit)} &nbsp; <strong>Available Balance:</strong> {viewAccount.available_balance != null ? fmt(viewAccount.available_balance) : '—'}</p>

            <h4 className="form-section-title">Account Details</h4>
            <p>{viewAccount.account_description || '—'}</p>
            <p><strong>Normal Balance:</strong> {viewAccount.normal_balance || '—'} &nbsp; <strong>Reconciliation Required:</strong> {viewAccount.reconciliation_required ? 'Yes' : 'No'} &nbsp; <strong>Allow Manual Entry:</strong> {viewAccount.allow_manual_entry ? 'Yes' : 'No'}</p>
            <p><strong>Tax Applicable:</strong> {viewAccount.tax_applicable ? 'Yes' : 'No'} &nbsp; <strong>Tax Code:</strong> {viewAccount.tax_code || '—'}</p>

            <h4 className="form-section-title">Bank Account Details</h4>
            <p><strong>Bank:</strong> {viewAccount.bank_name || '—'} &nbsp; <strong>Branch:</strong> {viewAccount.bank_branch_name || '—'} &nbsp; <strong>Holder:</strong> {viewAccount.account_holder_name || '—'}</p>
            <p><strong>Account #:</strong> {viewAccount.bank_account_number || '—'} &nbsp; <strong>IFSC:</strong> {viewAccount.ifsc_code || '—'} &nbsp; <strong>SWIFT:</strong> {viewAccount.swift_code || '—'} &nbsp; <strong>UPI:</strong> {viewAccount.upi_id || '—'}</p>

            <h4 className="form-section-title">System Fields</h4>
            <p><strong>Created By:</strong> {viewAccount.created_by || '—'} &nbsp; <strong>Created:</strong> {viewAccount.created_at ? new Date(viewAccount.created_at).toLocaleString() : '—'}</p>
            <p><strong>Updated By:</strong> {viewAccount.updated_by || '—'} &nbsp; <strong>Last Modified:</strong> {viewAccount.updated_at ? new Date(viewAccount.updated_at).toLocaleString() : '—'}</p>
            <p><strong>Last Transaction Date:</strong> {viewAccount.last_transaction_date ? new Date(viewAccount.last_transaction_date).toLocaleString() : '—'}</p>
            <p><strong>Remarks:</strong> {viewAccount.remarks || '—'}</p>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setViewAccount(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Accounts;
