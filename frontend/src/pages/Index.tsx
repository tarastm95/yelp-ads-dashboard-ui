
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  List,
  Clock,
  Info,
  Users,
  BookOpen
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

        {/* Test Credentials Information */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Info className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-blue-900">Test Account Information</h2>
          </div>
          <div className="text-blue-800 space-y-3">
            <p className="font-medium">
              FYI, these credentials are tied to 2 test accounts, so you can test out the Ads API's ability to create/edit/pause/resume of campaigns tied to these two Business IDs only:
            </p>
            <div className="bg-white rounded-md p-4 font-mono text-sm border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Test Business IDs:</span>
              </div>
              <ul className="space-y-1 ml-6">
                <li>• J9R1gG5xy7DpWsCWBup7DQ</li>
                <li>• e2JTWqyUwRHXjpG8TCZ7Ow</li>
              </ul>
            </div>
            <p className="text-sm">
              These credentials will also work for our Partner Support and Program Feature APIs, so once you're finished testing we will then generate "live" credentials for you that will be tied to your actual account as a Partner. Where then you will have the ability to create/edit/pause/resume campaigns for the accounts you manage as a Partner.
            </p>
          </div>
        </div>

        {/* How to Use Guide */}
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-green-900">How to Use This Application</h2>
          </div>
          <div className="text-green-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-green-900">Getting Started:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span>Enter your Yelp API credentials in the login form</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Navigate to "Program Management" to view existing campaigns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>Use "Program Creation" to create new advertising campaigns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span>Monitor operation status in "Task Monitoring"</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-green-900">Key Features:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Create Programs:</strong> Set up new advertising campaigns with custom settings</li>
                  <li>• <strong>Edit Programs:</strong> Modify existing campaign parameters and features</li>
                  <li>• <strong>Pause/Resume:</strong> Control campaign execution status</li>
                  <li>• <strong>Terminate Programs:</strong> End campaigns when needed</li>
                  <li>• <strong>Business Search:</strong> Find and select businesses for campaign targeting</li>
                  <li>• <strong>Feature Management:</strong> Configure advanced campaign features like custom text, photos, radius targeting, and more</li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-md p-4 border border-green-200">
              <p className="text-sm">
                <strong>Pro Tip:</strong> Start by exploring the "Program Management" section to see existing campaigns, then try creating a new program using one of the test Business IDs provided above.
              </p>
            </div>
          </div>
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
