import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLedgers, createLedger, updateLedger, deleteLedger } from '../api/ledgers';
import { getAccounts } from '../api/accounts';
import { getClients } from '../api/clients';
import { getVendors } from '../api/vendors';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { Search, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { validatePhone, validateIFSC } from '../utils/validators';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  // Basic information
  ledger_code: '', ledger_name: '', ledger_type: '', ledger_group: '', parent_ledger_id: '',
  opening_balance: '', current_balance: '', balance_type: 'debit', status: 'active',
  // Account information
  account_id: '', account_code: '', account_category: '', currency: 'INR',
  // Party information
  party_type: '', client_id: '', vendor_id: '', party_name: '', contact_person: '', mobile_number: '', email_address: '',
  // Bank details (optional)
  bank_account_id: '', bank_name: '', bank_account_number: '', ifsc_code: '', branch_name: '',
  // Notes
  remarks: '', internal_notes: ''
};

const Ledgers = () => {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState([]);
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
      const res = await getLedgers({ search, page, limit });
      setLedgers(res.data.rows); setTotal(res.data.total);
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

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      ledger_code: l.ledger_code || '', ledger_name: l.ledger_name || '', ledger_type: l.ledger_type || '',
      ledger_group: l.ledger_group || '', parent_ledger_id: l.parent_ledger_id || '',
      opening_balance: l.opening_balance ?? '', current_balance: l.current_balance ?? '',
      balance_type: l.balance_type || 'debit', status: l.status || 'active',
      account_id: l.account_id || '', account_code: l.account_code || '', account_category: l.account_category || '',
      currency: l.currency || 'INR',
      party_type: l.party_type || '', client_id: l.client_id || '', vendor_id: l.vendor_id || '',
      party_name: l.party_name || '', contact_person: l.contact_person || '', mobile_number: l.mobile_number || '',
      email_address: l.email_address || '',
      bank_account_id: l.bank_account_id || '', bank_name: l.bank_name || '', bank_account_number: l.bank_account_number || '',
      ifsc_code: l.ifsc_code || '', branch_name: l.branch_name || '',
      remarks: l.remarks || '', internal_notes: l.internal_notes || ''
    });
    setErrors({});
    setModal(true);
  };

  const validateMobile = (value) => {
    const check = validatePhone(value);
    setErrors(prev => ({ ...prev, mobile_number: check.valid ? '' : check.message }));
    return check.valid;
  };
  const validateIfsc = (value) => {
    const check = validateIFSC(value);
    setErrors(prev => ({ ...prev, ifsc_code: check.valid ? '' : check.message }));
    return check.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneCheck = validatePhone(form.mobile_number);
    const ifscCheck = validateIFSC(form.ifsc_code);
    if (!phoneCheck.valid || !ifscCheck.valid) {
      setErrors({ mobile_number: phoneCheck.valid ? '' : phoneCheck.message, ifsc_code: ifscCheck.valid ? '' : ifscCheck.message });
      return;
    }

    const payload = { ...form };
    ['account_id', 'bank_account_id', 'client_id', 'vendor_id', 'parent_ledger_id'].forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    setSaving(true);
    try {
      if (editing) await updateLedger(editing.id, payload);
      else await createLedger(payload);
      setModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ledger?')) return;
    try { await deleteLedger(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const viewStatement = (l) => {
    if (!l.account_id) { alert('This ledger is not linked to a Chart of Account, so it has no transaction statement.'); return; }
    navigate(`/ledger/${l.account_id}`);
  };

  const columns = [
    { key: 'ledger_code', label: 'Code', render: (v, r) => v || `LED-${String(r.id).padStart(5, '0')}` },
    { key: 'ledger_name', label: 'Ledger Name' },
    { key: 'ledger_type', label: 'Type', badge: true },
    { key: 'ledger_group', label: 'Group', render: v => v || '—' },
    { key: 'account_name', label: 'Chart of Account', render: v => v || '—' },
    { key: 'current_balance', label: 'Current Balance', render: (v, r) => <span>{fmt(v)} <small>{r.balance_type === 'credit' ? 'Cr' : 'Dr'}</small></span> },
    { key: 'party_name', label: 'Client/Vendor', render: v => v || '—' },
    { key: 'status', label: 'Status', badge: true },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" title="View Statement" onClick={() => viewStatement(r)}><BookOpen size={14} /></button>
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Ledgers" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search ledgers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <span className="toolbar-count">{total} ledgers</span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Ledger</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={ledgers} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Ledger' : 'Add Ledger'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Ledger Code</label>
              <input placeholder="Auto if left blank" value={form.ledger_code} onChange={e => setField('ledger_code', e.target.value)} />
            </div>
            <div className="form-group"><label>Ledger Name</label><input value={form.ledger_name} onChange={e => setField('ledger_name', e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Ledger Type</label>
              <select value={form.ledger_type} onChange={e => setField('ledger_type', e.target.value)}>
                <option value="">None</option>
                <option value="customer">Customer</option><option value="vendor">Vendor</option>
                <option value="bank">Bank</option><option value="cash">Cash</option>
                <option value="expense">Expense</option><option value="income">Income</option>
              </select>
            </div>
            <div className="form-group"><label>Ledger Group</label>
              <select value={form.ledger_group} onChange={e => setField('ledger_group', e.target.value)}>
                <option value="">None</option>
                <option value="assets">Assets</option><option value="liabilities">Liabilities</option>
                <option value="income">Income</option><option value="expenses">Expenses</option><option value="equity">Equity</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Parent Ledger</label>
              <select value={form.parent_ledger_id} onChange={e => setField('parent_ledger_id', e.target.value)}>
                <option value="">None</option>
                {ledgers.filter(l => !editing || l.id !== editing.id).map(l => <option key={l.id} value={l.id}>{l.ledger_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Balance Type</label>
              <select value={form.balance_type} onChange={e => setField('balance_type', e.target.value)}>
                <option value="debit">Debit</option><option value="credit">Credit</option>
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
            <div className="form-group"><label>Current Balance (₹)</label>
              <input type="number" step="0.01" placeholder="Auto = Opening Balance" value={form.current_balance} onChange={e => setField('current_balance', e.target.value)} />
            </div>
          </div>

          {/* Account information */}
          <h4 className="form-section-title">Account Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Chart of Account</label>
              <select value={form.account_id} onChange={e => {
                const id = e.target.value; setField('account_id', id);
                const acc = accounts.find(a => String(a.id) === String(id));
                if (acc) { setField('account_category', acc.type); setField('account_code', acc.code || ''); }
              }}>
                <option value="">None</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
            <div className="form-group"><label>Account Code</label><input value={form.account_code} onChange={e => setField('account_code', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Category</label>
              <select value={form.account_category} onChange={e => setField('account_category', e.target.value)}>
                <option value="">None</option>
                <option value="Asset">Asset</option><option value="Liability">Liability</option>
                <option value="Income">Income</option><option value="Expense">Expense</option><option value="Equity">Equity</option>
              </select>
            </div>
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
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
          {form.party_type && (
            <div className="form-row">
              <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  className={errors.mobile_number ? 'input-invalid' : ''}
                  value={form.mobile_number}
                  onChange={e => setField('mobile_number', e.target.value)}
                  onBlur={e => validateMobile(e.target.value)}
                />
                {errors.mobile_number && <span className="field-error">{errors.mobile_number}</span>}
              </div>
              <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>
            </div>
          )}

          {/* Bank details (optional) */}
          <h4 className="form-section-title">Bank Details (Optional)</h4>
          <div className="form-group"><label>Linked Bank Account</label>
            <select value={form.bank_account_id} onChange={e => {
              const id = e.target.value; setField('bank_account_id', id);
              const b = bankAccounts.find(x => String(x.id) === String(id));
              if (b) { setField('bank_name', b.bank_name || ''); setField('bank_account_number', b.account_number || ''); setField('ifsc_code', b.ifsc_code || ''); setField('branch_name', b.branch_name || ''); }
            }}>
              <option value="">None</option>
              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name} — {b.bank_name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
            <div className="form-group"><label>Account Number</label><input value={form.bank_account_number} onChange={e => setField('bank_account_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>IFSC Code</label>
              <input
                className={errors.ifsc_code ? 'input-invalid' : ''}
                value={form.ifsc_code}
                onChange={e => setField('ifsc_code', e.target.value.toUpperCase())}
                onBlur={e => validateIfsc(e.target.value)}
              />
              {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
            </div>
            <div className="form-group"><label>Branch Name</label><input value={form.branch_name} onChange={e => setField('branch_name', e.target.value)} /></div>
          </div>

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
                <span>Last Transaction Date: {editing.last_transaction_date ? new Date(editing.last_transaction_date).toLocaleString() : '—'}</span>
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

export default Ledgers;
