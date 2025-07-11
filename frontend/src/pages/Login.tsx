import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('credentials');
    if (stored) {
      const creds = JSON.parse(stored);
      setUsername(creds.username || '');
      setPassword(creds.password || '');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setCredentials({ username, password }));
    navigate('/');
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
      <Button type="submit" className="w-full">Войти</Button>
    </form>
  );
};

export default Login;
