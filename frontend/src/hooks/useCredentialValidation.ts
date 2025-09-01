import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearCredentials } from '../store/slices/authSlice';
import type { RootState } from '../store';

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
}

export const useCredentialValidation = () => {
  const dispatch = useDispatch();
  const { username, password } = useSelector((state: RootState) => state.auth);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    error: null
  });

  const validateCredentials = async (skipCache = false) => {
    // If no credentials, mark as invalid
    if (!username || !password || !username.trim() || !password.trim()) {
      setValidationState({
        isValidating: false,
        isValid: false,
        error: 'No credentials found'
      });
      return false;
    }

    // If we already have a validation result and not forcing refresh, return it
    if (!skipCache && validationState.isValid !== null) {
      return validationState.isValid;
    }

    setValidationState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const response = await fetch('/api/auth/validate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 401) {
        // Invalid credentials - clear them
        dispatch(clearCredentials());
        setValidationState({
          isValidating: false,
          isValid: false,
          error: 'Invalid credentials'
        });
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setValidationState({
          isValidating: false,
          isValid: false,
          error: errorData.error || `HTTP ${response.status}`
        });
        return false;
      }

      const result = await response.json();
      
      if (result.valid) {
        setValidationState({
          isValidating: false,
          isValid: true,
          error: null
        });
        return true;
      } else {
        // Invalid credentials - clear them
        dispatch(clearCredentials());
        setValidationState({
          isValidating: false,
          isValid: false,
          error: result.message || 'Invalid credentials'
        });
        return false;
      }
    } catch (error) {
      console.error('Credential validation error:', error);
      setValidationState({
        isValidating: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      });
      return false;
    }
  };

  // Auto-validate when credentials change
  useEffect(() => {
    if (username && password) {
      validateCredentials();
    } else {
      setValidationState({
        isValidating: false,
        isValid: false,
        error: 'No credentials'
      });
    }
  }, [username, password]);

  return {
    ...validationState,
    validateCredentials,
    hasCredentials: !!(username && password && username.trim() && password.trim())
  };
};
