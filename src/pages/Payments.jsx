import { useState, useEffect, useCallback } from 'react';
import { getPayments, createPayment, updatePayment, deletePayment } from '../api/payments';
import { getInvoices } from '../api/invoices';
import { getBills } from '../api/bills';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  invoice_id: '', bill_id: '',
  // Basic information
  payment_number: '', payment_date: new Date().toISOString().split('T')[0],
  payment_type: 'customer_payment', payment_status: 'completed',
  reference_number: '', currency: 'INR',
  // Customer / Vendor information
  contact_person: '', mobile_number: '', email_address: '',
  // Invoice / Bill details
  total_amount: '', amount: '', balance_amount: '',
  // Payment details
  payment_method: '', payment_mode: 'offline', transaction_id: '',
  cheque_number: '', bank_name: '', account_name: '', account_number: '',
  upi_id: '', payment_gateway: '',
  // Tax details
  tax_deducted: 0, tax_amount: 0, tax_type: '',
  // Additional details
  notes: '', attachment: '', received_by: '', approved_by: ''
};

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      const [pay, inv, bl] = await Promise.all([
        getPayments({ page, limit }),
        getInvoices({ limit: 100 }),
        getBills({ limit: 100 })
      ]);
      setPayments(pay.data.rows);
      setTotal(pay.data.total);
      setInvoices(inv.data.rows);
      setBills(bl.data.rows);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      invoice_id: p.invoice_id || '', bill_id: p.bill_id || '',
      payment_number: p.payment_number || '', payment_date: p.payment_date?.split('T')[0] || '',
      payment_type: p.payment_type || 'customer_payment', payment_status: p.payment_status || 'completed',
      reference_number: p.reference_number || '', currency: p.currency || 'INR',
      contact_person: p.contact_person || '', mobile_number: p.mobile_number || '', email_address: p.email_address || '',
      total_amount: p.total_amount || '', amount: p.amount || '', balance_amount: p.balance_amount || '',
      payment_method: p.payment_method || '', payment_mode: p.payment_mode || 'offline', transaction_id: p.transaction_id || '',
      cheque_number: p.cheque_number || '', bank_name: p.bank_name || '', account_name: p.account_name || '',
      account_number: p.account_number || '', upi_id: p.upi_id || '', payment_gateway: p.payment_gateway || '',
      tax_deducted: p.tax_deducted || 0, tax_amount: p.tax_amount || 0, tax_type: p.tax_type || '',
      notes: p.notes || '', attachment: p.attachment || '', received_by: p.received_by || '', approved_by: p.approved_by || ''
    });
    setError('');
    setModal(true);
  };

  // Auto-fill customer/vendor snapshot + total/balance when an invoice is picked
  const onInvoiceChange = (id) => {
    const inv = invoices.find(i => String(i.id) === String(id));
    setForm(f => ({
      ...f,
      invoice_id: id,
      bill_id: '',
      contact_person: inv ? `${inv.first_name || ''} ${inv.last_name || ''}`.trim() : f.contact_person,
      mobile_number: inv?.mobile_number || f.mobile_number,
      email_address: inv?.email_address || f.email_address,
      total_amount: inv?.total_amount ?? f.total_amount,
      balance_amount: inv?.balance_due ?? f.balance_amount
    }));
  };

  // Auto-fill vendor snapshot + total/balance when a bill is picked
  const onBillChange = (id) => {
    const bl = bills.find(b => String(b.id) === String(id));
    setForm(f => ({
      ...f,
      bill_id: id,
      invoice_id: '',
      contact_person: bl?.contact_person || f.contact_person,
      mobile_number: bl?.mobile_number || f.mobile_number,
      email_address: bl?.email_address || f.email_address,
      total_amount: bl?.amount ?? f.total_amount,
      balance_amount: bl?.balance_due ?? f.balance_amount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        invoice_id: form.invoice_id || null,
        bill_id: form.bill_id || null
      };
      if (editing) await updatePayment(editing.id, payload);
      else await createPayment(payload);
      setModal(false); fetchData();
    }
    catch (err) { setError(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment? This will reverse its effect on the books.')) return;
    try { await deletePayment(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'payment_number', label: 'Payment #', render: (v, r) => v || `PMT-${String(r.id).padStart(5, '0')}` },
    { key: 'payment_type', label: 'Type', badge: true },
    { key: 'ref', label: 'Invoice/Bill', render: (_, r) => r.invoice_id ? `INV-${String(r.invoice_id).padStart(4, '0')}` : r.bill_id ? `BILL-${String(r.bill_id).padStart(4, '0')}` : '—' },
    { key: 'first_name', label: 'Client', render: (_, r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.contact_person || '—' },
    { key: 'amount', label: 'Amount Paid', render: (v) => fmt(v) },
    { key: 'payment_method', label: 'Method', badge: true },
    { key: 'payment_status', label: 'Status', badge: true },
    { key: 'payment_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: 'Actions', render: (_, r) => (
      <div className="row-actions">
        <button className="icon-btn-sm" onClick={() => openEdit(r)}><Pencil size={14} /></button>
        <button className="icon-btn-sm danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="page">
      <Navbar title="Payments" />
      <div className="page-content">
        <div className="page-toolbar">
          <span className="toolbar-count">{total} payment{total !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Record Payment</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={payments} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Payment' : 'Record Payment'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Payment Number</label>
              <input placeholder="Auto if left blank" value={form.payment_number} onChange={e => setField('payment_number', e.target.value)} />
            </div>
            <div className="form-group"><label>Payment Date</label>
              <input type="date" value={form.payment_date} onChange={e => setField('payment_date', e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Payment Type</label>
              <select value={form.payment_type} onChange={e => setField('payment_type', e.target.value)}>
                <option value="customer_payment">Customer Payment</option>
                <option value="vendor_payment">Vendor Payment</option>
              </select>
            </div>
            <div className="form-group"><label>Payment Status</label>
              <select value={form.payment_status} onChange={e => setField('payment_status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reference Number</label>
              <input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} placeholder="Invoice / Bill reference" />
            </div>
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Invoice / Bill details */}
          <h4 className="form-section-title">Invoice / Bill Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Invoice</label>
              <select value={form.invoice_id} onChange={e => onInvoiceChange(e.target.value)} disabled={form.payment_type === 'vendor_payment'}>
                <option value="">Select invoice...</option>
                {invoices.map(i => <option key={i.id} value={i.id}>INV-{String(i.id).padStart(4, '0')} — {i.first_name} {i.last_name} ({i.status})</option>)}
              </select>
            </div>
            <div className="form-group"><label>Bill</label>
              <select value={form.bill_id} onChange={e => onBillChange(e.target.value)} disabled={form.payment_type === 'customer_payment'}>
                <option value="">Select bill...</option>
                {bills.map(b => <option key={b.id} value={b.id}>BILL-{String(b.id).padStart(4, '0')} — {b.vendor_name} ({b.status})</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Total Amount</label>
              <input type="number" step="0.01" value={form.total_amount} onChange={e => setField('total_amount', e.target.value)} />
            </div>
            <div className="form-group"><label>Amount Paid (₹)</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} required />
            </div>
            <div className="form-group"><label>Balance Amount</label>
              <input type="number" step="0.01" value={form.balance_amount} onChange={e => setField('balance_amount', e.target.value)} />
            </div>
          </div>

          {/* Customer / Vendor information */}
          <h4 className="form-section-title">Customer / Vendor Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group"><label>Mobile Number</label><input value={form.mobile_number} onChange={e => setField('mobile_number', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Email Address</label><input type="email" value={form.email_address} onChange={e => setField('email_address', e.target.value)} /></div>

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
            <div className="form-group"><label>Transaction ID</label><input value={form.transaction_id} onChange={e => setField('transaction_id', e.target.value)} /></div>
            <div className="form-group"><label>Payment Gateway</label>
              <input value={form.payment_gateway} onChange={e => setField('payment_gateway', e.target.value)} placeholder="Razorpay / Stripe / PayPal" />
            </div>
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
              <div className="form-group"><label>Account Number</label><input value={form.account_number} onChange={e => setField('account_number', e.target.value)} /></div>
            </div>
          )}
          {form.payment_method === 'upi' && (
            <div className="form-group"><label>UPI ID</label><input value={form.upi_id} onChange={e => setField('upi_id', e.target.value)} /></div>
          )}

          {/* Tax details */}
          <h4 className="form-section-title">Tax Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Tax Deducted (TDS)</label><input type="number" step="0.01" value={form.tax_deducted} onChange={e => setField('tax_deducted', e.target.value)} /></div>
            <div className="form-group"><label>Tax Amount</label><input type="number" step="0.01" value={form.tax_amount} onChange={e => setField('tax_amount', e.target.value)} /></div>
            <div className="form-group"><label>Tax Type</label>
              <select value={form.tax_type} onChange={e => setField('tax_type', e.target.value)}>
                <option value="">None</option>
                <option value="gst">GST</option><option value="tds">TDS</option><option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Additional details */}
          <h4 className="form-section-title">Additional Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Received By</label><input value={form.received_by} onChange={e => setField('received_by', e.target.value)} /></div>
            <div className="form-group"><label>Approved By</label><input value={form.approved_by} onChange={e => setField('approved_by', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Attachment (receipt/proof URL)</label><input value={form.attachment} onChange={e => setField('attachment', e.target.value)} /></div>
          <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} /></div>

          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payments;
