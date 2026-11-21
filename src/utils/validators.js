/**
 * Field Validation Utilities
 * Phone, GST Number (GSTIN), and Bank Account Number
 */

// Indian mobile number: optional +91/91/0 prefix, then a 10-digit number starting 6-9
const PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

// GSTIN: 2-digit state code, 10-char PAN, 1-digit entity code, 'Z', 1-char checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Bank account number: digits only, 9-18 characters (covers all major Indian banks)
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export const validatePhone = (value) => {
  const v = (value || '').trim();
  if (!v) return { valid: true, message: '' }; // phone is optional
  const digitsOnly = v.replace(/[\s-]/g, '');
  if (!PHONE_REGEX.test(digitsOnly)) {
    return { valid: false, message: 'Enter a valid 10-digit mobile number' };
  }
  return { valid: true, message: '' };
};

export const validateGST = (value) => {
  const v = (value || '').trim().toUpperCase();
  if (!v) return { valid: true, message: '' }; // GST is optional
  if (v.length !== 15) {
    return { valid: false, message: 'GSTIN must be exactly 15 characters' };
  }
  if (!GST_REGEX.test(v)) {
    return { valid: false, message: 'Enter a valid GSTIN (e.g. 22AAAAA0000A1Z5)' };
  }
  return { valid: true, message: '' };
};

// PAN: 5 letters, 4 digits, 1 letter (e.g. AAAAA0000A)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// IFSC: 4 letters (bank code), '0', then 6 alphanumeric (branch code)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const validatePAN = (value) => {
  const v = (value || '').trim().toUpperCase();
  if (!v) return { valid: true, message: '' }; // PAN is optional
  if (!PAN_REGEX.test(v)) {
    return { valid: false, message: 'Enter a valid PAN (e.g. AAAAA0000A)' };
  }
  return { valid: true, message: '' };
};

export const validateIFSC = (value) => {
  const v = (value || '').trim().toUpperCase();
  if (!v) return { valid: true, message: '' }; // IFSC is optional
  if (!IFSC_REGEX.test(v)) {
    return { valid: false, message: 'Enter a valid IFSC code (e.g. HDFC0001234)' };
  }
  return { valid: true, message: '' };
};

export const validateAccountNumber = (value) => {
  const v = (value || '').trim();
  if (!v) return { valid: false, message: 'Account number is required' };
  if (!ACCOUNT_NUMBER_REGEX.test(v)) {
    return { valid: false, message: 'Account number must be 9-18 digits, numbers only' };
  }
  return { valid: true, message: '' };
};
