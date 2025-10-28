import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { 
  Home,
  Plus,
  List,
  BarChart3,
  Clock,
  Menu,
  Edit,
  LogOut,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearCredentials } from '../store/slices/authSlice';
import type { RootState } from '../store';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { username } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Create Program', href: '/create', icon: Plus },
    { name: 'Programs', href: '/programs', icon: List },
    { name: 'Advanced Editing', href: '/edit-advanced', icon: Edit },
    { name: 'Task Monitor', href: '/jobs', icon: Clock },
    { name: 'Job History', href: '/job-history', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Yelp Ads Manager
                </h1>
                <p className="text-[10px] text-gray-500">Partner Dashboard</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200'
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info and Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{username || 'Guest'}</span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
