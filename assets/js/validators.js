/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Validators Module - Form validation utilities
 * ============================================================
 */

const Validators = {
  /* --------------------------------------------------------
   * FIELD VALIDATORS
   * -------------------------------------------------------- */

  /**
   * Check if value is not empty
   * @param {any} value
   * @returns {{ valid: boolean, message?: string }}
   */
  required(value) {
    const v = typeof value === 'string' ? value.trim() : value;
    return {
      valid: v !== undefined && v !== null && v !== '',
      message: 'This field is required.'
    };
  },

  /**
   * Validate email format
   * @param {string} email
   * @returns {{ valid: boolean, message?: string }}
   */
  email(email) {
    if (!email) return { valid: false, message: 'Email is required.' };
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: re.test(email.trim()),
      message: 'Please enter a valid email address.'
    };
  },

  /**
   * Validate positive number amount
   * @param {any} value
   * @param {Object} options - { min, max }
   * @returns {{ valid: boolean, message?: string }}
   */
  amount(value, options = {}) {
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: false, message: 'Please enter a valid amount.' };
    if (num <= 0) return { valid: false, message: 'Amount must be greater than zero.' };
    if (options.max && num > options.max) {
      return { valid: false, message: `Amount cannot exceed ₱${Utils.formatCurrency(options.max, false)}.` };
    }
    if (options.min && num < options.min) {
      return { valid: false, message: `Amount must be at least ₱${Utils.formatCurrency(options.min, false)}.` };
    }
    return { valid: true };
  },

  /**
   * Validate minimum length
   * @param {string} value
   * @param {number} min
   * @returns {{ valid: boolean, message?: string }}
   */
  minLength(value, min) {
    return {
      valid: value && value.trim().length >= min,
      message: `Must be at least ${min} characters.`
    };
  },

  /**
   * Validate maximum length
   * @param {string} value
   * @param {number} max
   * @returns {{ valid: boolean, message?: string }}
   */
  maxLength(value, max) {
    return {
      valid: !value || value.trim().length <= max,
      message: `Must not exceed ${max} characters.`
    };
  },

  /**
   * Validate phone number (PH format)
   * @param {string} phone
   * @returns {{ valid: boolean, message?: string }}
   */
  phone(phone) {
    if (!phone) return { valid: true }; // Optional field
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const re = /^(09|\+639)\d{9}$/;
    return {
      valid: re.test(cleaned),
      message: 'Please enter a valid Philippine phone number (e.g., 09171234567).'
    };
  },

  /**
   * Validate date is not empty and valid
   * @param {string} dateStr
   * @returns {{ valid: boolean, message?: string }}
   */
  date(dateStr) {
    if (!dateStr) return { valid: false, message: 'Date is required.' };
    const d = new Date(dateStr);
    return {
      valid: !isNaN(d.getTime()),
      message: 'Please enter a valid date.'
    };
  },

  /**
   * Validate date is not in the future
   * @param {string} dateStr
   * @returns {{ valid: boolean, message?: string }}
   */
  dateNotFuture(dateStr) {
    if (!dateStr) return { valid: false, message: 'Date is required.' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { valid: false, message: 'Please enter a valid date.' };
    return {
      valid: d <= new Date(),
      message: 'Date cannot be in the future.'
    };
  },

  /**
   * Validate select has a value
   * @param {string} value
   * @returns {{ valid: boolean, message?: string }}
   */
  select(value) {
    return {
      valid: value !== undefined && value !== null && value !== '' && value !== 'default',
      message: 'Please select an option.'
    };
  },

  /* --------------------------------------------------------
   * FORM VALIDATION
   * -------------------------------------------------------- */

  /**
   * Validate an entire form using a rules config
   * @param {Object} formData - Key-value pairs of form data
   * @param {Object} rules - Validation rules { fieldName: [{ type: 'required' }, { type: 'email' }] }
   * @returns {{ isValid: boolean, errors: Object }}
   *
   * @example
   * const result = Validators.validateForm(
   *   { email: 'test@test.com', amount: '5000' },
   *   {
   *     email: [{ type: 'required' }, { type: 'email' }],
   *     amount: [{ type: 'required' }, { type: 'amount', options: { max: 70000 } }]
   *   }
   * );
   */
  validateForm(formData, rules) {
    const errors = {};
    let isValid = true;

    Object.entries(rules).forEach(([field, fieldRules]) => {
      const value = formData[field];

      for (const rule of fieldRules) {
        let result;
        switch (rule.type) {
          case 'required':
            result = this.required(value);
            break;
          case 'email':
            result = this.email(value);
            break;
          case 'amount':
            result = this.amount(value, rule.options || {});
            break;
          case 'minLength':
            result = this.minLength(value, rule.min);
            break;
          case 'maxLength':
            result = this.maxLength(value, rule.max);
            break;
          case 'phone':
            result = this.phone(value);
            break;
          case 'date':
            result = this.date(value);
            break;
          case 'dateNotFuture':
            result = this.dateNotFuture(value);
            break;
          case 'select':
            result = this.select(value);
            break;
          case 'custom':
            result = rule.validate(value, formData);
            break;
          default:
            result = { valid: true };
        }

        if (!result.valid) {
          errors[field] = rule.message || result.message;
          isValid = false;
          break; // Stop at first error per field
        }
      }
    });

    return { isValid, errors };
  },

  /* --------------------------------------------------------
   * UI ERROR DISPLAY
   * -------------------------------------------------------- */

  /**
   * Show error for a specific field
   * @param {string} fieldId - Input element ID
   * @param {string} message - Error message
   */
  showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    // Add error class
    input.classList.add('error');
    input.classList.remove('success');

    // Find or create error element
    const group = input.closest('.form-group') || input.parentElement;
    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      group.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    // Set aria attributes
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `${fieldId}-error`);
    errorEl.id = `${fieldId}-error`;
  },

  /**
   * Clear error for a specific field
   * @param {string} fieldId - Input element ID
   */
  clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    input.classList.remove('error');
    input.setAttribute('aria-invalid', 'false');

    const group = input.closest('.form-group') || input.parentElement;
    const errorEl = group.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  },

  /**
   * Clear all form errors
   * @param {HTMLFormElement|string} form - Form element or selector
   */
  clearAllErrors(form) {
    const formEl = typeof form === 'string' ? document.querySelector(form) : form;
    if (!formEl) return;

    formEl.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    formEl.querySelectorAll('.form-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    formEl.querySelectorAll('[aria-invalid]').forEach(el => {
      el.setAttribute('aria-invalid', 'false');
    });
  },

  /**
   * Display validation result errors on the form
   * @param {Object} errors - { fieldName: errorMessage } from validateForm
   */
  displayErrors(errors) {
    Object.entries(errors).forEach(([field, message]) => {
      this.showFieldError(field, message);
    });
  },

  /**
   * Validate and display errors for a form in one call
   * @param {Object} formData - Form data
   * @param {Object} rules - Validation rules
   * @param {HTMLFormElement} formEl - Optional form element to clear first
   * @returns {boolean} True if valid
   */
  validateAndDisplay(formData, rules, formEl) {
    if (formEl) this.clearAllErrors(formEl);
    const { isValid, errors } = this.validateForm(formData, rules);
    if (!isValid) this.displayErrors(errors);
    return isValid;
  },

  /* --------------------------------------------------------
   * REAL-TIME VALIDATION
   * -------------------------------------------------------- */

  /**
   * Attach real-time validation to a form
   * @param {string} formSelector - Form CSS selector
   * @param {Object} rules - Validation rules
   */
  attachRealTimeValidation(formSelector, rules) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    Object.keys(rules).forEach(fieldId => {
      const input = document.getElementById(fieldId);
      if (!input) return;

      // Validate on blur
      input.addEventListener('blur', () => {
        const value = input.type === 'checkbox' ? input.checked : input.value;
        const fieldRules = rules[fieldId];
        let hasError = false;

        for (const rule of fieldRules) {
          let result;
          switch (rule.type) {
            case 'required':
              result = this.required(value);
              break;
            case 'email':
              result = this.email(value);
              break;
            case 'amount':
              result = this.amount(value, rule.options || {});
              break;
            case 'phone':
              result = this.phone(value);
              break;
            default:
              result = { valid: true };
          }

          if (!result.valid) {
            this.showFieldError(fieldId, rule.message || result.message);
            hasError = true;
            break;
          }
        }

        if (!hasError) {
          this.clearFieldError(fieldId);
          if (input.value.trim()) {
            input.classList.add('success');
          }
        }
      });

      // Clear error on input
      input.addEventListener('input', () => {
        this.clearFieldError(fieldId);
      });
    });
  }
};
