
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Plus, 
  List, 
  Search, 
  BarChart3, 
  Clock, 
  Settings,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigation = [
    { name: 'Главная', href: '/', icon: Home },
    { name: 'Создать программу', href: '/create', icon: Plus },
    { name: 'Программы', href: '/programs', icon: List },
    { name: 'Поиск бизнесов', href: '/search', icon: Search },
    { name: 'Аналитика', href: '/dashboard', icon: BarChart3 },
    { name: 'Мониторинг задач', href: '/jobs', icon: Clock },
    { name: 'Управление категориями', href: '/categories', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 bg-white shadow-sm">
          <h1 className="text-lg font-semibold">Yelp Ads Manager</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="lg:flex">
        {/* Sidebar */}
        <div className={cn(
          "lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0",
          sidebarOpen ? "block" : "hidden lg:block"
        )}>
          <div className="flex flex-col flex-grow bg-white shadow-lg">
            <div className="flex items-center flex-shrink-0 px-4 py-6">
              <h1 className="text-xl font-bold text-gray-900">
                Yelp Ads Manager
              </h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <IconComponent
                      className={cn(
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-5 w-5'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
