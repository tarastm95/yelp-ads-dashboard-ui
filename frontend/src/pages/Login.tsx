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

  // Отримуємо поточний стан авторизації
  const { username: currentUsername, password: currentPassword } = useSelector((state: RootState) => state.auth);
  
  // Отримуємо шлях звідки користувач прийшов
  const from = location.state?.from?.pathname || '/';

  // Перевіряємо чи користувач уже авторизований
  useEffect(() => {
    const isAuthenticated = currentUsername && currentPassword && 
                           currentUsername.trim() !== '' && currentPassword.trim() !== '';
    
    if (isAuthenticated) {
      // Якщо вже авторизований, перенаправляємо на головну сторінку
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
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Отправляем credentials на backend для сохранения
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
      
      // Сохраняем в Redux и localStorage
      dispatch(setCredentials({ username, password }));
      
      toast({
        title: "Успешно",
        description: `Credentials сохранены для пользователя: ${username}`,
      });
      
      // Перенаправляємо на сторінку звідки прийшов користувач або на головну
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Ошибка входа",
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
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
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Введите ваши Yelp API credentials
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Логин (Yelp API Key)
              </Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
                placeholder="Введите ваш Yelp API Key"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль (Yelp API Secret)
              </Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Введите ваш Yelp API Secret"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Сохранение...' : 'Войти'}
          </Button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Credentials будут сохранены для использования с Yelp API
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
