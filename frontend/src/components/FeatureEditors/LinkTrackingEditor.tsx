import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, Save, X } from 'lucide-react';

interface LinkTrackingData {
  website?: string | null;
  menu?: string | null;
  url?: string | null;
}

interface LinkTrackingEditorProps {
  data?: LinkTrackingData;
  onSave: (data: LinkTrackingData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LinkTrackingEditor: React.FC<LinkTrackingEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<LinkTrackingData>({
    website: data?.website || '',
    menu: data?.menu || '',
    url: data?.url || ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        website: data.website || '',
        menu: data.menu || '',
        url: data.url || ''
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty strings to null
    const processedData = {
      website: formData.website?.trim() || null,
      menu: formData.menu?.trim() || null,
      url: formData.url?.trim() || null
    };
    
    onSave(processedData);
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is OK
    
    // Check if it's a full URL
    try {
      new URL(url);
      return true;
    } catch {
      // Check if it's URL parameters only (starts with utm_ or contains =)
      if (url.includes('=') && !url.includes('://')) {
        // Simple validation for parameters like "utm_source=yelp&utm_medium=cpc"
        return /^[a-zA-Z0-9_]+=.+(&[a-zA-Z0-9_]+=.+)*$/.test(url);
      }
      return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          Link tracking settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://mysite.com?utm_source=yelp or utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.website || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              Full URL or just UTM parameters to track website visits
            </p>
          </div>

          <div>
            <Label htmlFor="menu">Menu URL</Label>
            <Input
              id="menu"
              type="url"
              value={formData.menu || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, menu: e.target.value }))}
              placeholder="https://mysite.com/menu?utm_source=yelp or utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.menu || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              Full URL or just UTM parameters to track visits to the menu
            </p>
          </div>

          <div>
            <Label htmlFor="url">Call-to-Action URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://mysite.com/contact?utm_source=yelp or utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.url || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              URL for the Call-to-Action button. Used when AD_GOAL = WEBSITE_CLICKS
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 How tracking works:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Empty field:</strong> use standard external URL (no tracking)</li>
              <li>• <strong>Full URL:</strong> https://mysite.com/page?utm_source=yelp</li>
              <li>• <strong>Parameters only:</strong> utm_source=yelp&utm_medium=cpc (Yelp will append to existing URL)</li>
              <li>• <strong>Relation to AD_GOAL:</strong> if AD_GOAL = WEBSITE_CLICKS and url is set, tracking URL is used</li>
              <li>• <strong>All fields null:</strong> feature is considered disabled</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🎯 Important to know:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Link tracking applies to <strong>CPC traffic</strong> from Yelp ads</li>
              <li>• Base URLs for organic traffic are set via the Data Ingestion API</li>
              <li>• The <code>url</code> field controls the CTA button (Call-to-Action)</li>
              <li>• Example "parameters only": {`{"LINK_TRACKING": {"website": "utm_source=yelp&utm_medium=cpc"}}`}</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save settings
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LinkTrackingEditor;