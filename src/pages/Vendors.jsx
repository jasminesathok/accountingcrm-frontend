import { useState, useEffect, useCallback } from 'react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../api/vendors';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { validatePasswordStrength } from '../utils/passwordValidator';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { validatePhone, validateGST, validatePAN, validateIFSC } from '../utils/validators';

const EMPTY = {
  // Basic information
  name: '', vendor_code: '', vendor_type: 'business', company_name: '', industry: '',
  status: 'active', vendor_since: '',
  // Contact information
  contact_person: '', designation: '', phone: '', alternate_mobile: '',
  email: '', alternate_email: '', website: '',
  // Address details
  billing_address: '', shipping_address: '', city: '', state: '', country: '', pin_code: '',
  // Tax details
  gst_number: '', pan_number: '', tan_number: '', cin_number: '', msme_number: '',
  tax_type: 'gst', gst_state_code: '',
  // Financial details
  currency: 'INR', credit_limit: '', payment_terms: '', opening_balance: '',
  outstanding_amount: '', credit_days: '', default_purchase_discount: '',
  // Bank details
  bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', branch_name: '', upi_id: '',
  // Purchase information
  purchase_representative: '', vendor_category: '', products_supplied: '',
  preferred_payment_method: '', delivery_terms: '',
  // Communication preferences
  email_notifications: true, sms_notifications: false, whatsapp_notifications: false,
  // Notes & remarks
  internal_notes: '', vendor_remarks: '',
  password: ''
};

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const limit = 10;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendors({ search, page, limit });
      setVendors(res.data.rows);
      setTotal(res.data.total);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      ...EMPTY,
      ...v,
      vendor_since: v.vendor_since?.split('T')[0] || '',
      password: ''
    });
    setErrors({});
    setModal(true);
  };

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validateField = (field, value) => {
    const checkers = { phone: validatePhone, alternate_mobile: validatePhone, gst_number: validateGST, pan_number: validatePAN, ifsc_code: validateIFSC };
    const check = checkers[field](value);
    setErrors(prev => ({ ...prev, [field]: check.valid ? '' : check.message }));
    return check.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const checks = {
      phone: validatePhone(form.phone),
      alternate_mobile: validatePhone(form.alternate_mobile),
      gst_number: validateGST(form.gst_number),
      pan_number: validatePAN(form.pan_number),
      ifsc_code: validateIFSC(form.ifsc_code)
    };
    const failed = Object.entries(checks).filter(([, c]) => !c.valid);
    if (failed.length) {
      setErrors(Object.fromEntries(failed.map(([k, c]) => [k, c.message])));
      return;
    }

    // Password only required/validated for new vendors (a login is created for them)
    if (!editing && !form.password) {
      alert('Password is required for new vendors');
      return;
    }
    if (!editing && form.password) {
      const strength = validatePasswordStrength(form.password);
      if (!strength.passed) {
        alert(strength.message);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) delete payload.password; // don't send a blank password on edit
      if (editing) await updateVendor(editing.id, payload);
      else await createVendor(payload);
      setModal(false); fetchVendors();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try { await deleteVendor(id); fetchVendors(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const columns = [
    { key: 'vendor_code', label: 'Code', render: (v, r) => v || `V-${String(r.id).padStart(4, '0')}` },
    { key: 'name', label: 'Name' },
    { key: 'company_name', label: 'Company' },
    { key: 'phone', label: 'Mobile' },
    { key: 'vendor_category', label: 'Category' },
    { key: 'outstanding_balance', label: 'Outstanding', render: (v) => v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : '—' },
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
      <Navbar title="Vendors" />
      <div className="page-content">
        <div className="page-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Vendor</button>
        </div>
        <div className="section-card">
          <DataTable columns={columns} data={vendors} loading={loading} page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Vendor' : 'Add Vendor'} size="xl">
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Basic information */}
          <h4 className="form-section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Vendor Name</label><input value={form.name} onChange={e => setField('name', e.target.value)} required /></div>
            <div className="form-group"><label>Vendor Code</label><input placeholder="Auto if left blank" value={form.vendor_code} onChange={e => setField('vendor_code', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Vendor Type</label>
              <select value={form.vendor_type} onChange={e => setField('vendor_type', e.target.value)}>
                <option value="individual">Individual</option><option value="business">Business</option>
              </select>
            </div>
            <div className="form-group"><label>Company Name</label><input value={form.company_name} onChange={e => setField('company_name', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Industry</label><input value={form.industry} onChange={e => setField('industry', e.target.value)} /></div>
            <div className="form-group"><label>Vendor Since</label><input type="date" value={form.vendor_since} onChange={e => setField('vendor_since', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Contact information */}
          <h4 className="form-section-title">Contact Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} /></div>
            <div className="form-group"><label>Designation</label><input value={form.designation} onChange={e => setField('designation', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                className={errors.phone ? 'input-invalid' : ''}
                placeholder="9876543210"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                onBlur={e => validateField('phone', e.target.value)}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label>Alternate Mobile</label>
              <input
                className={errors.alternate_mobile ? 'input-invalid' : ''}
                value={form.alternate_mobile}
                onChange={e => setField('alternate_mobile', e.target.value)}
                onBlur={e => validateField('alternate_mobile', e.target.value)}
              />
              {errors.alternate_mobile && <span className="field-error">{errors.alternate_mobile}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email Address</label><input type="email" value={form.email} onChange={e => setField('email', e.target.value)} /></div>
            <div className="form-group"><label>Alternate Email</label><input type="email" value={form.alternate_email} onChange={e => setField('alternate_email', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Website</label><input value={form.website} onChange={e => setField('website', e.target.value)} /></div>

          {!editing && (
            <PasswordStrengthIndicator password={form.password} onChange={(pwd) => setField('password', pwd)} />
          )}

          {/* Address details */}
          <h4 className="form-section-title">Address Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Billing Address</label><textarea rows={2} value={form.billing_address} onChange={e => setField('billing_address', e.target.value)} /></div>
            <div className="form-group"><label>Shipping Address</label><textarea rows={2} value={form.shipping_address} onChange={e => setField('shipping_address', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>City</label><input value={form.city} onChange={e => setField('city', e.target.value)} /></div>
            <div className="form-group"><label>State</label><input value={form.state} onChange={e => setField('state', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Country</label><input value={form.country} onChange={e => setField('country', e.target.value)} /></div>
            <div className="form-group"><label>PIN Code</label><input value={form.pin_code} onChange={e => setField('pin_code', e.target.value)} /></div>
          </div>

          {/* Tax details */}
          <h4 className="form-section-title">Tax Details</h4>
          <div className="form-row">
            <div className="form-group">
              <label>GST Number</label>
              <input
                className={errors.gst_number ? 'input-invalid' : ''}
                placeholder="22AAAAA0000A1Z5"
                value={form.gst_number}
                onChange={e => setField('gst_number', e.target.value.toUpperCase())}
                onBlur={e => validateField('gst_number', e.target.value)}
                maxLength={15}
              />
              {errors.gst_number && <span className="field-error">{errors.gst_number}</span>}
            </div>
            <div className="form-group">
              <label>PAN Number</label>
              <input
                className={errors.pan_number ? 'input-invalid' : ''}
                placeholder="AAAAA0000A"
                value={form.pan_number}
                onChange={e => setField('pan_number', e.target.value.toUpperCase())}
                onBlur={e => validateField('pan_number', e.target.value)}
                maxLength={10}
              />
              {errors.pan_number && <span className="field-error">{errors.pan_number}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>TAN Number</label><input value={form.tan_number} onChange={e => setField('tan_number', e.target.value)} /></div>
            <div className="form-group"><label>CIN Number</label><input value={form.cin_number} onChange={e => setField('cin_number', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>MSME Number</label><input value={form.msme_number} onChange={e => setField('msme_number', e.target.value)} /></div>
            <div className="form-group"><label>Tax Type</label>
              <select value={form.tax_type} onChange={e => setField('tax_type', e.target.value)}>
                <option value="gst">GST</option><option value="non_gst">Non-GST</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>GST State Code</label><input style={{ maxWidth: 120 }} value={form.gst_state_code} onChange={e => setField('gst_state_code', e.target.value)} /></div>

          {/* Financial details */}
          <h4 className="form-section-title">Financial Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="form-group"><label>Credit Limit (₹)</label><input type="number" step="0.01" value={form.credit_limit} onChange={e => setField('credit_limit', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Payment Terms (days)</label>
              <select value={form.payment_terms} onChange={e => setField('payment_terms', e.target.value)}>
                <option value="">Select...</option>
                <option value="15">15 Days</option><option value="30">30 Days</option>
                <option value="45">45 Days</option><option value="60">60 Days</option>
              </select>
            </div>
            <div className="form-group"><label>Credit Days</label><input type="number" value={form.credit_days} onChange={e => setField('credit_days', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Opening Balance (₹)</label><input type="number" step="0.01" value={form.opening_balance} onChange={e => setField('opening_balance', e.target.value)} /></div>
            <div className="form-group"><label>Outstanding Amount (₹)</label><input type="number" step="0.01" value={form.outstanding_amount} onChange={e => setField('outstanding_amount', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Default Purchase Discount (%)</label><input type="number" step="0.01" style={{ maxWidth: 160 }} value={form.default_purchase_discount} onChange={e => setField('default_purchase_discount', e.target.value)} /></div>

          {/* Bank details */}
          <h4 className="form-section-title">Bank Details</h4>
          <div className="form-row">
            <div className="form-group"><label>Bank Name</label><input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
            <div className="form-group"><label>Account Holder Name</label><input value={form.account_holder_name} onChange={e => setField('account_holder_name', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Account Number</label><input value={form.account_number} onChange={e => setField('account_number', e.target.value)} /></div>
            <div className="form-group">
              <label>IFSC Code</label>
              <input
                className={errors.ifsc_code ? 'input-invalid' : ''}
                placeholder="HDFC0001234"
                value={form.ifsc_code}
                onChange={e => setField('ifsc_code', e.target.value.toUpperCase())}
                onBlur={e => validateField('ifsc_code', e.target.value)}
              />
              {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Branch Name</label><input value={form.branch_name} onChange={e => setField('branch_name', e.target.value)} /></div>
            <div className="form-group"><label>UPI ID</label><input value={form.upi_id} onChange={e => setField('upi_id', e.target.value)} /></div>
          </div>

          {/* Purchase information */}
          <h4 className="form-section-title">Purchase Information</h4>
          <div className="form-row">
            <div className="form-group"><label>Purchase Representative</label><input value={form.purchase_representative} onChange={e => setField('purchase_representative', e.target.value)} /></div>
            <div className="form-group"><label>Vendor Category</label>
              <select value={form.vendor_category} onChange={e => setField('vendor_category', e.target.value)}>
                <option value="">Select...</option>
                <option value="local">Local</option><option value="national">National</option><option value="international">International</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Products Supplied</label><textarea rows={2} value={form.products_supplied} onChange={e => setField('products_supplied', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Preferred Payment Method</label>
              <select value={form.preferred_payment_method} onChange={e => setField('preferred_payment_method', e.target.value)}>
                <option value="">Select...</option>
                <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group"><label>Delivery Terms</label><input value={form.delivery_terms} onChange={e => setField('delivery_terms', e.target.value)} /></div>
          </div>

          {/* Communication preferences */}
          <h4 className="form-section-title">Communication Preferences</h4>
          <div className="form-row form-checkbox-row">
            <label className="checkbox-inline"><input type="checkbox" checked={form.email_notifications} onChange={e => setField('email_notifications', e.target.checked)} /> Email Notifications</label>
            <label className="checkbox-inline"><input type="checkbox" checked={form.sms_notifications} onChange={e => setField('sms_notifications', e.target.checked)} /> SMS Notifications</label>
            <label className="checkbox-inline"><input type="checkbox" checked={form.whatsapp_notifications} onChange={e => setField('whatsapp_notifications', e.target.checked)} /> WhatsApp Notifications</label>
          </div>

          {/* Notes & remarks */}
          <h4 className="form-section-title">Notes &amp; Remarks</h4>
          <div className="form-group"><label>Internal Notes (staff only)</label><textarea rows={2} value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)} /></div>
          <div className="form-group"><label>Vendor Remarks</label><textarea rows={2} value={form.vendor_remarks} onChange={e => setField('vendor_remarks', e.target.value)} /></div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vendors;
