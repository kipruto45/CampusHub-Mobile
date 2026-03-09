// Form Validation Helpers for CampusResources

// Email validation
export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email';
  return null;
};

// Password validation
export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
};

// Password confirmation validation
export const validatePasswordConfirm = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

// Required field validation
export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
};

// Registration number validation (university-specific)
export const validateRegistrationNumber = (regNumber: string): string | null => {
  if (!regNumber) return 'Registration number is required';
  // Adjust regex based on your university's format
  const regRegex = /^[A-Z]{2,4}\/\d{5,7}$/i;
  if (!regRegex.test(regNumber)) return 'Invalid registration number format';
  return null;
};

// Phone validation
export const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
  return null;
};

// URL validation
export const validateUrl = (url: string): string | null => {
  if (!url) return null; // URL is optional
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

// File size validation (in bytes)
export const validateFileSize = (size: number, maxSizeMB: number): string | null => {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (size > maxSize) return `File must be less than ${maxSizeMB}MB`;
  return null;
};

// Combine multiple validators
export const validateField = (
  value: string,
  validators: Array<(value: string) => string | null>
): string | null => {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
};

// Form validation hook result
export interface ValidationErrors {
  [key: string]: string | null;
}

export interface ValidationValues {
  [key: string]: string;
}

export const validateForm = (
  values: ValidationValues,
  rules: {
    [key: string]: Array<(value: string) => string | null>;
  }
): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  for (const field in rules) {
    const value = values[field] || '';
    errors[field] = validateField(value, rules[field]);
  }
  
  return errors;
};

// Check if form is valid
export const isFormValid = (errors: ValidationErrors): boolean => {
  return Object.values(errors).every((error) => error === null);
};
