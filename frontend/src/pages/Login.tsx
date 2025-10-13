import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, clearCredentials } from '../store/slices/authSlice';
import type { RootState } from '../store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Get current authentication state
  const { username: currentUsername, password: currentPassword } = useSelector((state: RootState) => state.auth);
  
  // Get the path the user came from and any error message
  const from = location.state?.from?.pathname || '/';
  const authError = location.state?.error;

  // Check if the user is already authenticated
  useEffect(() => {
    const isAuthenticated = currentUsername && currentPassword && 
                           currentUsername.trim() !== '' && currentPassword.trim() !== '';
    
    // Only redirect if authenticated and no auth error (to prevent redirect loops)
    if (isAuthenticated && !authError) {
      // If already authenticated, redirect to the origin page
      navigate(from, { replace: true });
    }
  }, [currentUsername, currentPassword, navigate, from, authError]);

  // Show error message if redirected due to authentication failure
  useEffect(() => {
    if (authError) {
      // Clear invalid credentials when redirected due to auth failure
      dispatch(clearCredentials());
      toast({
        title: "Authentication Required",
        description: authError,
        variant: "destructive",
      });
    }
  }, [authError, dispatch]);

  useEffect(() => {
    const stored = localStorage.getItem('credentials');
    if (stored) {
      try {
        const creds = JSON.parse(stored);
        setUsername(creds.username || '');
        setPassword(creds.password || '');
      } catch (err) {
        console.error('Failed to parse credentials from localStorage', err);
        localStorage.removeItem('credentials');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // First, validate credentials against Yelp API
      const validateResponse = await fetch('/api/auth/validate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (validateResponse.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid login or password. Please check your Yelp API credentials.",
          variant: "destructive",
        });
        return;
      }

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${validateResponse.status}: ${validateResponse.statusText}`);
      }

      const validateResult = await validateResponse.json();
      
      if (!validateResult.valid) {
        toast({
          title: "Authentication Failed",
          description: validateResult.message || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      // Show success message for validation
      toast({
        title: "Validation Successful",
        description: "Credentials are valid! Logging in...",
      });

      // If validation passed, save credentials to the backend
      const saveResponse = await fetch('/api/auth/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save credentials: HTTP ${saveResponse.status}`);
      }

      const saveResult = await saveResponse.json();
      
      // Save to Redux and localStorage
      dispatch(setCredentials({ username, password }));
      
      toast({
        title: "Login Successful",
        description: `Credentials validated and saved for user: ${username}`,
      });
      
      // Redirect to the originating page or home
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Yelp API credentials - they will be validated before saving
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Login (Yelp API Key)
              </Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
                placeholder="Enter your Yelp API Key"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password (Yelp API Secret)
              </Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => {
                  // Prevent any automatic escaping by preserving the raw value
                  const rawValue = e.target.value;
                  setPassword(rawValue);
                }}
                className="mt-1"
                placeholder="Enter your Yelp API Secret"
                required
                autoComplete="new-password"
                spellCheck={false}
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Validating credentials...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Credentials will be validated against Yelp API and stored securely
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
