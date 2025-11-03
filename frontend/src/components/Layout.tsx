import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Home,
  Plus,
  List,
  BarChart3,
  Clock,
  Menu,
  Edit,
  LogOut,
  Sparkles,
  Pause,
  DollarSign,
  ChevronDown
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

  // Main navigation items (not in dropdowns)
  const mainNav = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Programs', href: '/programs', icon: List },
    { name: 'Create Program', href: '/create', icon: Plus },
  ];

  // Scheduled tasks dropdown
  const scheduledTasks = [
    { name: 'Scheduled Pauses', href: '/scheduled-pauses', icon: Pause },
    { name: 'Scheduled Budget Updates', href: '/scheduled-budget-updates', icon: DollarSign },
  ];

  // Monitoring & History dropdown
  const monitoring = [
    { name: 'Task Monitor', href: '/jobs', icon: Clock },
    { name: 'Job History', href: '/job-history', icon: BarChart3 },
  ];

  // Settings dropdown
  const settings = [
    { name: 'Advanced Editing', href: '/edit-advanced', icon: Edit },
  ];

  const isInDropdown = (href: string) => {
    return scheduledTasks.some(item => item.href === href) ||
           monitoring.some(item => item.href === href) ||
           settings.some(item => item.href === href);
  };

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
              {/* Main navigation items */}
              {mainNav.map((item) => {
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

              {/* Scheduled Tasks Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      isInDropdown(location.pathname)
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Scheduled</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Scheduled Tasks</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {scheduledTasks.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2 cursor-pointer',
                            isActive && 'bg-blue-50 text-blue-700'
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Monitoring Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      isInDropdown(location.pathname)
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200'
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Monitoring</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Monitoring & History</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {monitoring.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2 cursor-pointer',
                            isActive && 'bg-blue-50 text-blue-700'
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      isInDropdown(location.pathname)
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200'
                    )}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Settings</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {settings.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2 cursor-pointer',
                            isActive && 'bg-blue-50 text-blue-700'
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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
          <div className="w-full mx-auto px-3 sm:px-4 lg:px-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

