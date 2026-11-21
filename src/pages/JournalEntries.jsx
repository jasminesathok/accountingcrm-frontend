import { useState, useEffect, useCallback } from 'react';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../api/journal';
import { getAccounts } from '../api/accounts';
import { getClients } from '../api/clients';
import { getVendors } from '../api/vendors';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Trash2, PlusCircle, MinusCircle, Eye, CheckCircle, Send, Ban, Search } from 'lucide-react';

const fmt = (n) => n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
const todayISO = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  // Basic information
  date: todayISO(), journal_type: 'General', posting_period: '', status: 'Draft',
  voucher_number: '', voucher_type: 'journal', reference_number: '',
  // Account details (lines)
  items: [{ account_id: '', debit: '', credit: '', description: '' }, { account_id: '', debit: '', credit: '', description: '' }],
  // Party information
  client_id: '', vendor_id: '', contact_person: '', invoice_bill_number: '', transaction_reference: '',
  // Tax details
  tax_type: '', tax_percentage: '', tax_amount: '', tax_account_id: '',
  // Attachments (file paths / URLs)
  supporting_documents: '', invoice_attachment: '', receipt_attachment: '',
  // Approval details
  prepared_by: '', reviewed_by: '',
  // Notes
  description: '', internal_notes: ''
});

const JournalEntries = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, a, c, v] = await Promise.all([
        getJournalEntries({ page, limit, status: statusFilter || undefined, search: search || undefined }),
        getAccounts(),
        getClients({ limit: 1000 }),
        getVendors({ limit: 1000 })
      ]);
      setEntries(e.data.rows); setTotal(e.data.total); setAccounts(a.data);
      setClients(c.data.rows || c.data || []);
      setVendors(v.data.rows || v.data || []);
    } catch (ex) { console.error(ex); } finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addLine = () => setForm(f => ({ ...f, items: [...f.items, { account_id: '', debit: '', credit: '', description: '' }] }));
  const removeLine = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  const totalDebit = form.items.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
  const totalCredit = form.items.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const openNew = () => { setForm(emptyForm()); setError(''); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!balanced) { setError('Debits must equal credits'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // Empty optional numeric/FK fields should go through as null, not ''
      ['client_id', 'vendor_id', 'tax_account_id', 'tax_percentage', 'tax_amount'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await createJournalEntry(payload); setModal(false); fetchData();
      setForm(emptyForm());
    } catch (err) { setError(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this journal entry?')) return;
    try { await deleteJournalEntry(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleStatusChange = async (entry, status) => {
    try { await updateJournalEntry(entry.id, { status }); fetchData(); }
    catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleApprove = async (entry, approval_status) => {
    try { await updateJournalEntry(entry.id, { approval_status }); fetchData(); }
    catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const partyName = (r) => {
    if (r.Client) return r.Client.company_name || `${r.Client.first_name || ''} ${r.Client.last_name || ''}`.trim();
    if (r.Vendor) return r.Vendor.company_name || r.Vendor.name;
    return '—';
  };

  const lineTotal = (r, key) => (r.JournalLines || []).reduce((s, l) => s + (parseFloat(l[key]) || 0), 0);

  const columns = [
    { key: 'journal_number', label: 'Journal #', render: (v, r) => v || `JE-${String(r.id).padStart(6, '0')}` },
    { key: 'date', label: 'Entry Date', render: v => new Date(v).toLocaleDateString() },
    { key: 'journal_type', label: 'Type', render: v => v || 'General' },
    { key: 'posting_period', label: 'Posting Period', render: v => v || '—' },
    { key: 'party', label: 'Client/Vendor', render: (_, r) => partyName(r) },
    { key: 'debit_total', label: 'Debit (₹)', render: (_, r) => fmt(lineTotal(r, 'debit')) },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'Draft'} /> },
    { key: 'approval_status', label: 'Approval', render: v => <StatusBadge status={v || 'Pending'} /> },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" title="View" onClick={() => setViewEntry(r)}><Eye size={14} /></button>
        {r.status !== 'Posted' && r.status !== 'Cancelled' && (
          <button className="icon-btn-sm" title="Post" onClick={() => handleStatusChange(r, 'Posted')}><Send size={14} /></button>
        )}
        {r.approval_status !== 'Approved' && (
          <button className="icon-btn-sm" title="Approve" onClick={() => handleApprove(r, 'Approved')}><CheckCircle size={14} /></button>
        )}
        {r.status !== 'Cancelled' && (
          <button className="icon-btn-sm" title="Cancel" onClick={() => handleStatusChange(r, 'Cancelled')}><Ban size={14} /></button>
        )}
        <button className="icon-btn-sm danger" title="Delete" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Journal Entries" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search journal #, voucher, reference..." value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} /></div>
          <span className="toolbar-count">{total} entries</span>
          <select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Posted">Posted</option>
            <option value="Approved">Approved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Entry</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={entries} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      {/* ---------------- New Journal Entry ---------------- */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Journal Entry" size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Entry Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group"><label>Journal Type</label>
              <select value={form.journal_type} onChange={e => setForm({ ...form, journal_type: e.target.value })}>
                <option value="General">General</option><option value="Adjustment">Adjustment</option>
                <option value="Opening">Opening</option><option value="Closing">Closing</option>
                <option value="Recurring">Recurring</option>
              </select>
            </div>
            <div className="form-group"><label>Posting Period</label><input type="month" value={form.posting_period} onChange={e => setForm({ ...form, posting_period: e.target.value })} placeholder="Defaults to entry date" /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="Draft">Draft</option><option value="Posted">Posted</option>
                <option value="Approved">Approved</option><option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Voucher Number</label><input value={form.voucher_number} onChange={e => setForm({ ...form, voucher_number: e.target.value })} /></div>
            <div className="form-group"><label>Voucher Type</label>
              <select value={form.voucher_type} onChange={e => setForm({ ...form, voucher_type: e.target.value })}>
                <option value="journal">Journal</option><option value="payment">Payment</option>
                <option value="receipt">Receipt</option><option value="contra">Contra</option>
                <option value="sales">Sales</option><option value="purchase">Purchase</option>
              </select>
            </div>
            <div className="form-group"><label>Reference Number</label><input placeholder="Invoice/Bill/Payment reference" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
          </div>

          <h4 className="form-section-title">Account Details</h4>
          <div className="je-table">
            <table className="data-table">
              <thead><tr><th>Account</th><th>Description</th><th>Debit (₹)</th><th>Credit (₹)</th><th></th></tr></thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <select value={item.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)} required>
                        <option value="">Select account...</option>
                        {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(type => (
                          <optgroup key={type} label={type}>
                            {accounts.filter(a => a.type === type).map(a => <option key={a.id} value={a.id}>{a.code ? `${a.code} — ${a.name}` : a.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td><input value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Narration for this line" /></td>
                    <td><input type="number" step="0.01" min="0" value={item.debit} onChange={e => updateLine(i, 'debit', e.target.value)} placeholder="0.00" /></td>
                    <td><input type="number" step="0.01" min="0" value={item.credit} onChange={e => updateLine(i, 'credit', e.target.value)} placeholder="0.00" /></td>
                    <td>{form.items.length > 2 && <button type="button" className="icon-btn-sm danger" onClick={() => removeLine(i)}><MinusCircle size={14} /></button>}</td>
                  </tr>
                ))}
                <tr className="je-totals">
                  <td><strong>Totals</strong></td>
                  <td></td>
                  <td className={totalDebit > 0 ? 'text-blue' : ''}><strong>{fmt(totalDebit)}</strong></td>
                  <td className={totalCredit > 0 ? 'text-blue' : ''}><strong>{fmt(totalCredit)}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}><PlusCircle size={14} /> Add Line</button>

          {error && <div className="alert alert-error">{error}</div>}
          {!balanced && totalDebit > 0 && <div className="alert alert-warning">Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</div>}
          {balanced && totalDebit > 0 && <div className="alert alert-success">✓ Balanced</div>}

          <h4 className="form-section-title">Party Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Client (optional)</label>
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value, vendor_id: '' })}>
                <option value="">— None —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || `${c.first_name} ${c.last_name}`}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Vendor (optional)</label>
              <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value, client_id: '' })}>
                <option value="">— None —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Invoice/Bill Number</label><input value={form.invoice_bill_number} onChange={e => setForm({ ...form, invoice_bill_number: e.target.value })} /></div>
            <div className="form-group"><label>Transaction Reference</label><input value={form.transaction_reference} onChange={e => setForm({ ...form, transaction_reference: e.target.value })} placeholder="Related transaction ID" /></div>
          </div>

          <h4 className="form-section-title">Tax Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Tax Type</label>
              <select value={form.tax_type} onChange={e => setForm({ ...form, tax_type: e.target.value })}>
                <option value="">— None —</option>
                <option value="GST">GST</option><option value="TDS">TDS</option><option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>Tax Percentage</label><input type="number" step="0.01" min="0" value={form.tax_percentage} onChange={e => setForm({ ...form, tax_percentage: e.target.value })} /></div>
            <div className="form-group"><label>Tax Amount</label><input type="number" step="0.01" min="0" value={form.tax_amount} onChange={e => setForm({ ...form, tax_amount: e.target.value })} /></div>
            <div className="form-group"><label>Tax Account</label>
              <select value={form.tax_account_id} onChange={e => setForm({ ...form, tax_account_id: e.target.value })}>
                <option value="">— None —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code ? `${a.code} — ${a.name}` : a.name}</option>)}
              </select>
            </div>
          </div>

          <h4 className="form-section-title">Attachments</h4>
          <div className="form-row">
            <div className="form-group"><label>Supporting Documents</label><input value={form.supporting_documents} onChange={e => setForm({ ...form, supporting_documents: e.target.value })} placeholder="File path / URL" /></div>
            <div className="form-group"><label>Invoice Attachment</label><input value={form.invoice_attachment} onChange={e => setForm({ ...form, invoice_attachment: e.target.value })} placeholder="File path / URL" /></div>
            <div className="form-group"><label>Receipt Attachment</label><input value={form.receipt_attachment} onChange={e => setForm({ ...form, receipt_attachment: e.target.value })} placeholder="File path / URL" /></div>
          </div>

          <h4 className="form-section-title">Approval &amp; Notes</h4>
          <div className="form-row">
            <div className="form-group"><label>Prepared By</label><input value={form.prepared_by} onChange={e => setForm({ ...form, prepared_by: e.target.value })} placeholder="Defaults to your account" /></div>
            <div className="form-group"><label>Reviewed By</label><input value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Narration</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explanation of the journal entry" /></div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}><label>Internal Notes</label><textarea rows={2} value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} placeholder="Staff-only notes" /></div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !balanced}>{saving ? 'Posting...' : 'Save Entry'}</button>
          </div>
        </form>
      </Modal>

      {/* ---------------- View Journal Entry ---------------- */}
      <Modal isOpen={!!viewEntry} onClose={() => setViewEntry(null)} title={`Journal Entry ${viewEntry?.journal_number || ''}`} size="lg">
        {viewEntry && (
          <div className="modal-form">
            <h4 className="form-section-title">Basic Information</h4>
            <p><strong>Entry Date:</strong> {new Date(viewEntry.date).toLocaleDateString()} &nbsp; <strong>Type:</strong> {viewEntry.journal_type || 'General'} &nbsp; <strong>Posting Period:</strong> {viewEntry.posting_period || '—'}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewEntry.status || 'Draft'} /> &nbsp; <strong>Voucher:</strong> {viewEntry.voucher_number || '—'} ({viewEntry.voucher_type || '—'}) &nbsp; <strong>Reference #:</strong> {viewEntry.reference_number || '—'}</p>

            <h4 className="form-section-title">Account Details</h4>
            <table className="data-table">
              <thead><tr><th>Account Code</th><th>Account Name</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                {(viewEntry.JournalLines || []).map(l => (
                  <tr key={l.id}>
                    <td>{l.Account?.code || '—'}</td>
                    <td>{l.Account?.name || '—'}</td>
                    <td>{l.description || '—'}</td>
                    <td>{fmt(l.debit)}</td>
                    <td>{fmt(l.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="form-section-title">Party Information</h4>
            <p><strong>Client/Vendor:</strong> {partyName(viewEntry)} &nbsp; <strong>Contact Person:</strong> {viewEntry.contact_person || '—'}</p>
            <p><strong>Invoice/Bill #:</strong> {viewEntry.invoice_bill_number || '—'} &nbsp; <strong>Transaction Reference:</strong> {viewEntry.transaction_reference || '—'}</p>

            <h4 className="form-section-title">Tax Details</h4>
            <p><strong>Tax Type:</strong> {viewEntry.tax_type || '—'} &nbsp; <strong>Tax %:</strong> {viewEntry.tax_percentage || '0'} &nbsp; <strong>Tax Amount:</strong> {fmt(viewEntry.tax_amount)} &nbsp; <strong>Tax Account:</strong> {viewEntry.TaxAccount?.name || '—'}</p>

            <h4 className="form-section-title">Attachments</h4>
            <p><strong>Supporting Documents:</strong> {viewEntry.supporting_documents || '—'}</p>
            <p><strong>Invoice Attachment:</strong> {viewEntry.invoice_attachment || '—'} &nbsp; <strong>Receipt Attachment:</strong> {viewEntry.receipt_attachment || '—'}</p>

            <h4 className="form-section-title">Approval Details</h4>
            <p><strong>Prepared By:</strong> {viewEntry.prepared_by || '—'} &nbsp; <strong>Reviewed By:</strong> {viewEntry.reviewed_by || '—'} &nbsp; <strong>Approved By:</strong> {viewEntry.approved_by || '—'}</p>
            <p><strong>Approval Status:</strong> <StatusBadge status={viewEntry.approval_status || 'Pending'} /> &nbsp; <strong>Approval Date:</strong> {viewEntry.approval_date ? new Date(viewEntry.approval_date).toLocaleDateString() : '—'}</p>

            <h4 className="form-section-title">Notes</h4>
            <p><strong>Narration:</strong> {viewEntry.description || '—'}</p>
            <p><strong>Internal Notes:</strong> {viewEntry.internal_notes || '—'}</p>

            <h4 className="form-section-title">System Fields</h4>
            <p><strong>Created By:</strong> {viewEntry.created_by || '—'} &nbsp; <strong>Created:</strong> {viewEntry.created_at ? new Date(viewEntry.created_at).toLocaleString() : '—'}</p>
            <p><strong>Updated By:</strong> {viewEntry.updated_by || '—'} &nbsp; <strong>Last Modified:</strong> {viewEntry.updated_at ? new Date(viewEntry.updated_at).toLocaleString() : '—'}</p>
            <p><strong>Posted By:</strong> {viewEntry.posted_by || '—'} &nbsp; <strong>Posted Date:</strong> {viewEntry.posted_date ? new Date(viewEntry.posted_date).toLocaleString() : '—'}</p>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setViewEntry(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JournalEntries;
