import React from 'react';
import { Check, X } from 'lucide-react';
import './PasswordStrengthIndicator.css';
import { validatePasswordStrength, getPasswordRequirements } from '../utils/passwordValidator';

const PasswordStrengthIndicator = ({ password, onChange }) => {
  const strength = validatePasswordStrength(password);
  const requirements = getPasswordRequirements();

  return (
    <div className="password-strength-container">
      <div className="form-group">
        <label>
          Password
          {strength.passed && <span className="required-indicator" style={{ color: 'green' }}>✓</span>}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter password"
          required
          className={`password-input ${strength.passed ? 'valid' : 'invalid'}`}
        />
      </div>

      {password && (
        <div className="password-feedback">
          <div className="strength-bar">
            <div className="strength-meter">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`meter-segment ${i < strength.score ? `segment-${strength.color}` : 'segment-empty'}`}
                />
              ))}
            </div>
            <span className={`strength-level strength-${strength.color}`}>{strength.level}</span>
          </div>
          
          <div className="strength-message" style={{ color: strength.color }}>
            {strength.message}
          </div>

          <div className="requirements-checklist">
            <div className="requirements-title">Password Requirements:</div>
            {requirements.map((req) => (
              <div key={req.id} className="requirement-item">
                {strength.checks[req.id] ? (
                  <Check size={16} style={{ color: 'green' }} className="requirement-icon" />
                ) : (
                  <X size={16} style={{ color: '#ccc' }} className="requirement-icon" />
                )}
                <span className={strength.checks[req.id] ? 'checked' : ''}>{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
