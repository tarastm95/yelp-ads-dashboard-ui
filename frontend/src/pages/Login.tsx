import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
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
  
  // Get the path the user came from
  const from = location.state?.from?.pathname || '/';

  // Check if the user is already authenticated
  useEffect(() => {
    const isAuthenticated = currentUsername && currentPassword && 
                           currentUsername.trim() !== '' && currentPassword.trim() !== '';
    
    if (isAuthenticated) {
      // If already authenticated, redirect to the origin page
      navigate(from, { replace: true });
    }
  }, [currentUsername, currentPassword, navigate, from]);

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
      // Send credentials to the backend for storage
      const response = await fetch('http://localhost:8000/api/auth/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Save to Redux and localStorage
      dispatch(setCredentials({ username, password }));
      
      toast({
        title: "Success",
        description: `Credentials saved for user: ${username}`,
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
            Enter your Yelp API credentials
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
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter your Yelp API Secret"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Credentials will be stored for use with the Yelp API
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
