
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TEST_BUSINESS_IDS, TEST_ENVIRONMENT_INFO } from '@/constants/testData';
import { 
  Plus,
  List,
  Clock,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  TestTube,
  Building
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      title: 'Создание программ',
      description: 'Создавайте новые рекламные программы Yelp',
      icon: Plus,
      path: '/create',
      color: 'bg-blue-500',
    },
    {
      title: 'Управление программами',
      description: 'Полный цикл Yelp Ads API: Create, Modify, Terminate, Status + Pause/Resume',
      icon: List,
      path: '/programs',
      color: 'bg-green-500',
    },
    {
      title: 'Мониторинг задач',
      description: 'Отслеживайте статус выполнения операций',
      icon: Clock,
      path: '/jobs',
      color: 'bg-red-500',
    },
    {
      title: 'API Тестування',
      description: 'Тестуйте правильні запити до Yelp Ads API',
      icon: TestTube,
      path: '/api-test',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Yelp Ads Campaign Manager
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Полнофункциональная панель управления рекламными кампаниями Yelp. 
            Создавайте, управляйте и анализируйте ваши рекламные программы.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Активные программы</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Общий бюджет</p>
                  <p className="text-2xl font-bold">$25,480</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Обслуживаемые бизнесы</p>
                  <p className="text-2xl font-bold">38</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Environment Notice */}
        <div className="mb-12">
          <Card className="border-l-4 border-l-orange-500 bg-orange-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500">
                  <TestTube className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-orange-800">🧪 Тестове середовище Yelp Ads API</CardTitle>
                  <CardDescription className="text-orange-700">
                    Поточно використовуються тестові облікові дані з обмеженим доступом
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Доступні тестові Business IDs:
                  </h4>
                  <div className="space-y-2">
                    {TEST_BUSINESS_IDS.map((businessId, index) => (
                      <div key={businessId} className="bg-white p-3 rounded border font-mono text-sm">
                        <div className="font-semibold text-gray-700">Business #{index + 1}:</div>
                        <code className="text-blue-600 select-all">{businessId}</code>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Обмеження тестового режиму:
                  </h4>
                  <ul className="space-y-2 text-sm text-orange-700">
                    {TEST_ENVIRONMENT_INFO.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="block w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border-l-4 border-l-blue-500">
                <p className="text-sm text-gray-700">
                  <strong>Примітка:</strong> {TEST_ENVIRONMENT_INFO.note}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <Card key={feature.path} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${feature.color}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to={feature.path}>
                      Перейти
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Быстрые действия</h2>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/create">
                <Plus className="mr-2 h-4 w-4" />
                Создать программу
              </Link>
            </Button>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Yelp Ads API</h3>
          <p className="text-gray-600 mb-4">
            Этот интерфейс использует официальный Yelp Ads API для управления рекламными кампаниями.
          </p>
          <Button asChild variant="link">
            <a 
              href="https://docs.developer.yelp.com/docs/ads-api" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Документация API →
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
