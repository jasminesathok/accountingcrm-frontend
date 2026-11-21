/**
 * Password Strength Validation Utility
 */

export const validatePasswordStrength = (password) => {
  const result = {
    score: 0,
    level: 'Weak',
    color: 'red',
    message: '',
    passed: false,
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      special: false
    }
  };

  if (!password) {
    result.message = 'Password is required';
    return result;
  }

  // Check length (minimum 6 characters) - THIS IS THE ONLY REQUIREMENT
  if (password.length >= 6) {
    result.checks.length = true;
    result.score += 1;
    result.passed = true;
    result.level = 'Good';
    result.color = 'green';
    result.message = '✓ Password accepted!';
  } else {
    result.level = 'Weak';
    result.color = 'red';
    result.message = 'Password must be at least 6 characters';
    result.passed = false;
  }

  // Optional checks for display - these don't block submission
  if (/[A-Z]/.test(password)) {
    result.checks.uppercase = true;
    result.score += 1;
  }

  if (/[a-z]/.test(password)) {
    result.checks.lowercase = true;
    result.score += 1;
  }

  if (/\d/.test(password)) {
    result.checks.numbers = true;
    result.score += 1;
  }

  if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/.test(password)) {
    result.checks.special = true;
    result.score += 1;
  }

  return result;
};

export const getPasswordRequirements = () => [
  { id: 'length', label: 'At least 6 characters (Required)', icon: '✓', required: true },
  { id: 'uppercase', label: 'One uppercase letter (A-Z) - Optional', icon: '✓', required: false },
  { id: 'lowercase', label: 'One lowercase letter (a-z) - Optional', icon: '✓', required: false },
  { id: 'numbers', label: 'One number (0-9) - Optional', icon: '✓', required: false },
  { id: 'special', label: 'One special character (!@#$...) - Optional', icon: '✓', required: false }
];
