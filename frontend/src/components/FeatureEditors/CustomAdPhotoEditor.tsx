import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImageIcon, Save, X, Info, Eye, ExternalLink } from 'lucide-react';

interface CustomAdPhotoData {
  custom_photo_id: string | null;
}

interface CustomAdPhotoEditorProps {
  data?: CustomAdPhotoData;
  onSave: (data: CustomAdPhotoData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomAdPhotoEditor: React.FC<CustomAdPhotoEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [photoId, setPhotoId] = useState<string>(data?.custom_photo_id || '');
  const [isEnabled, setIsEnabled] = useState<boolean>(!!data?.custom_photo_id);

  useEffect(() => {
    if (data) {
      setPhotoId(data.custom_photo_id || '');
      setIsEnabled(!!data.custom_photo_id);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      custom_photo_id: isEnabled && photoId.trim() ? photoId.trim() : null
    });
  };

  const isValidPhotoId = (id: string): boolean => {
    // Photo ID should be alphanumeric and reasonable length
    const photoIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    return photoIdPattern.test(id);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Custom ad photo settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Switch
              id="photo-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <div>
              <Label htmlFor="photo-enabled" className="text-base font-medium">
                Use custom photo in ads
              </Label>
              <p className="text-sm text-gray-600">
                {isEnabled
                  ? 'Your custom photo will be shown in ads instead of the automatically selected one'
                  : 'Yelp will automatically choose the best photo for ads'
                }
              </p>
            </div>
          </div>

          {isEnabled && (
            <div className="space-y-4">
              {/* Photo ID Input */}
              <div>
                <Label htmlFor="photoId">Photo ID *</Label>
                <Input
                  id="photoId"
                  value={photoId}
                  onChange={(e) => setPhotoId(e.target.value)}
                  placeholder="custom_photo_id"
                  required
                  className={`${
                    photoId && !isValidPhotoId(photoId) ? 'border-red-500' : ''
                  }`}
                />
                
                {photoId && !isValidPhotoId(photoId) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Photo ID must contain only letters, numbers, hyphens, and underscores (3-50 characters)
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Identifier of the photo to display in the ad. Clear the field to revert to automatic selection.
                </p>
              </div>

              {/* How to find Photo ID */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How to obtain the photo ID:
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li>• <strong>Data Ingestion API:</strong> After uploading a photo via the API, you receive the photo_id in the job status—save and use it</li>
                  <li>• <strong>Official APIs:</strong> Use IDs obtained from official Yelp API endpoints</li>
                  <li>• <strong>Business profile:</strong> Photo ID from your verified Yelp business profile</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-100 rounded border text-xs">
                  <strong>Important:</strong> Use only IDs obtained from official Yelp APIs. Unofficial methods are not guaranteed.
                </div>
              </div>

              {/* Photo Requirements */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">📋 Photo requirements:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Photo must already be uploaded to your Yelp profile</li>
                  <li>• High quality and relevant to your business</li>
                  <li>• Complies with Yelp Content Guidelines</li>
                  <li>• Yelp may moderate content that violates guidelines</li>
                  <li>• Use high resolution (Yelp will resize automatically)</li>
                </ul>
              </div>

              {/* Best Practices */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">💡 Tips for effective advertising:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Quality:</strong> Use bright, clear photos</li>
                  <li>• <strong>Representativeness:</strong> The photo should showcase your product/service</li>
                  <li>• <strong>Emotion:</strong> Photos that evoke positive emotions perform better</li>
                  <li>• <strong>Uniqueness:</strong> Avoid stock photos</li>
                  <li>• <strong>Relevance:</strong> Use up-to-date photos of your business</li>
                </ul>
              </div>

              {/* Preview Section */}
              {photoId && isValidPhotoId(photoId) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Selected photo:
                  </h4>
                  <div className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Photo ID: <code className="bg-gray-100 px-2 py-1 rounded">{photoId}</code></p>
                      <p className="text-xs text-gray-500">This photo will be used in ads</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const yelpUrl = `https://www.yelp.com/biz_photos/search?find_desc=&find_loc=&bfind=${photoId}`;
                        window.open(yelpUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View on Yelp
                    </Button>
                  </div>
                </div>
              )}

              {/* Alternative Options */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">🎯 Alternatives:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Automatic selection:</strong> Yelp will choose the best photos automatically</li>
                  <li>• <strong>A/B testing:</strong> Try different photos and compare results</li>
                  <li>• <strong>Portfolio projects:</strong> Create creatives based on your portfolio (portfolio photo_id ≠ custom_photo_id)</li>
                  <li>• <strong>Seasonality:</strong> Change photos according to season or promotions</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || (isEnabled && (!photoId.trim() || !isValidPhotoId(photoId)))} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save photo settings
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

export default CustomAdPhotoEditor;
