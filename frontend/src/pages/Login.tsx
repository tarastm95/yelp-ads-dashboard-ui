import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      
      navigate('/');
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
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-4 mt-10">
      <div className="space-y-2">
        <Label htmlFor="username">Логин</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Сохранение...' : 'Войти'}
      </Button>
    </form>
  );
};

export default Login;
