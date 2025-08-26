
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  List,
  Clock
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      title: 'Program Creation',
      description: 'Create new Yelp advertising programs',
      icon: Plus,
      path: '/create',
      color: 'bg-blue-500',
    },
    {
      title: 'Program Management',
      description: 'Full Yelp Ads API cycle: Create, Modify, Terminate, Status + Pause/Resume',
      icon: List,
      path: '/programs',
      color: 'bg-green-500',
    },
    {
      title: 'Task Monitoring',
      description: 'Track the status of operations',
      icon: Clock,
      path: '/jobs',
      color: 'bg-red-500',
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
            A full-featured dashboard for managing Yelp advertising campaigns.
            Create, manage, and analyze your advertising programs.
          </p>
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
                      Go
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Program
              </Link>
            </Button>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Yelp Ads API</h3>
          <p className="text-gray-600 mb-4">
            This interface uses the official Yelp Ads API to manage advertising campaigns.
          </p>
          <Button asChild variant="link">
            <a 
              href="https://docs.developer.yelp.com/docs/ads-api" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              API Documentation →
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
