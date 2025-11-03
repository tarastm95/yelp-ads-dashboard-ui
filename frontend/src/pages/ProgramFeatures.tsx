import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeatureEditorManager, { FeatureType } from '../components/FeatureEditors/FeatureEditorManager';
import { 
  useGetProgramFeaturesQuery, 
  useUpdateProgramFeaturesMutation,
  useGetPartnerProgramInfoQuery
} from '../store/api/yelpApi';
import { 
  Loader2, Settings, Save, Info, 
  Globe, Phone, Camera, MapPin, Clock, 
  Target, Shield, Star, Award, Link, FolderOpen, Briefcase
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatFeatureType } from '@/lib/utils';

// Detailed descriptions of all Program Features types according to Yelp documentation
const FEATURE_DESCRIPTIONS = {
  LINK_TRACKING: {
    icon: Link,
    title: 'Link Tracking',
    description: 'Configure tracking parameters for website, menu and CTA buttons',
    fields: {
      website: 'URL or tracking parameters for website link',
      menu: 'URL or tracking parameters for menu link',
      url: 'URL or tracking parameters for CTA button'
    },
    validation: 'All fields can be null to disable tracking'
  },

  NEGATIVE_KEYWORD_TARGETING: {
    icon: Target,
    title: 'Negative Keyword Targeting',
    description: 'Manage keywords for which your ads should NOT be shown',
    fields: {
      suggested_keywords: 'List of suggested keywords (up to 25, reference only)',
      blocked_keywords: 'List of blocked keywords (you can add your own)'
    },
    validation: 'Suggested words are reference only, ads may show for words not included in the list'
  },

  STRICT_CATEGORY_TARGETING: {
    icon: Shield,
    title: 'Strict Category Targeting',
    description: 'Enable/disable strict targeting by business categories',
    fields: {
      enabled: 'Enable strict targeting (true/false)'
    },
    validation: 'Boolean value to enable/disable the feature'
  },

  AD_SCHEDULING: {
    icon: Clock,
    title: 'Ad Scheduling',
    description: 'Configure ad display times according to business operating hours',
    fields: {
      uses_opening_hours: 'Show ads only during business hours (true/false)'
    },
    validation: 'If true and business hours are 8-17, ads will not show at 6:00 PM'
  },

  CUSTOM_LOCATION_TARGETING: {
    icon: MapPin,
    title: 'Custom Location Targeting',
    description: 'Configure specific locations for ad display',
    fields: {
      businesses: 'List of businesses in the advertising campaign',
      'businesses[].business_id': 'Business ID',
      'businesses[].locations': 'List of locations (up to 25 per business): ZIP codes, cities, counties, states (US only)'
    },
    validation: 'Maximum 25 locations per business, US locations only'
  },

  AD_GOAL: {
    icon: Target,
    title: 'Ad Goal',
    description: 'Define the main goal of the advertising campaign',
    fields: {
      ad_goal: 'Ad goal: DEFAULT, CALLS or WEBSITE_CLICKS'
    },
    validation: 'Must be one of three values: DEFAULT, CALLS, WEBSITE_CLICKS'
  },

  CALL_TRACKING: {
    icon: Phone,
    title: 'Call Tracking',
    description: 'Configure tracking of phone calls from advertisements',
    fields: {
      enabled: 'Enable call tracking at campaign level',
      businesses: 'List of businesses in the campaign',
      'businesses[].business_id': 'Business ID',
      'businesses[].metered_phone_number': 'Phone number for tracking (null to disable)'
    },
    validation: 'Phone number can be null to disable tracking for specific business'
  },

  SERVICE_OFFERINGS_TARGETING: {
    icon: Briefcase,
    title: 'Service Offerings Targeting',
    description: 'Control which service offerings are advertised in your campaigns',
    fields: {
      disabled_service_offerings: 'List of service offerings to exclude from ads (Required)',
      enabled_service_offerings: 'List of service offerings to include in ads (Optional for POST)'
    },
    validation: 'For POST requests, disabled_service_offerings is required, enabled_service_offerings can be omitted'
  },

  BUSINESS_HIGHLIGHTS: {
    icon: Star,
    title: 'Business Highlights',
    description: 'Manage business features highlighted in advertisements',
    fields: {
      active_business_highlights: 'Active business highlights',
      available_business_highlights: 'Available highlights for selection',
      mutually_exclusive_business_highlights: 'Pairs of highlights that cannot be active simultaneously'
    },
    validation: 'Some highlights are mutually exclusive'
  },

  VERIFIED_LICENSE: {
    icon: Award,
    title: 'Verified License',
    description: 'Manage verified business licenses',
    fields: {
      'licenses[].license_number': 'License number',
      'licenses[].license_expiry_date': 'License expiry date (YYYY-MM-DD)',
      'licenses[].license_trade': 'Business or field for which the license is issued',
      'licenses[].license_issuing_agency': 'License issuing authority',
      'licenses[].license_verification_status': 'Verification status: PENDING, VERIFIED, REJECTED',
      'licenses[].license_verification_failure_reason': 'Reason for verification failure'
    },
    validation: 'Verification status is required, date may be optional'
  },

  CUSTOM_RADIUS_TARGETING: {
    icon: MapPin,
    title: 'Custom Radius Targeting',
    description: 'Configure specific radius for ad display around the business',
    fields: {
      custom_radius: 'Radius in miles (1-60) or null to disable'
    },
    validation: 'Value from 1 to 60 miles, null means disabled feature'
  },

  CUSTOM_AD_TEXT: {
    icon: Info,
    title: 'Custom Ad Text',
    description: 'Configure custom text or use text from reviews',
    fields: {
      custom_review_id: 'Review ID to extract text from',
      custom_text: 'Custom ad text'
    },
    validation: 'Only one field can be filled, the other must be null. By default, Yelp sets the text'
  },

  CUSTOM_AD_PHOTO: {
    icon: Camera,
    title: 'Custom Ad Photo',
    description: 'Configure custom photo for display in advertisements',
    fields: {
      custom_photo_id: 'Photo ID for display in ads or null to disable'
    },
    validation: 'ID must reference an existing business photo'
  },

  BUSINESS_LOGO: {
    icon: Camera,
    title: 'Business Logo',
    description: 'Configure brand logo for use in advertisements',
    fields: {
      business_logo_url: 'Business logo URL'
    },
    validation: 'URL must be a publicly accessible image of type: jpeg/png/gif/tiff'
  },

  YELP_PORTFOLIO: {
    icon: Globe,
    title: 'Yelp Portfolio',
    description: 'Manage portfolio projects for display in advertisements',
    fields: {
      'projects[].project_id': 'Project ID',
      'projects[].published': 'Whether the project is published (true/false)'
    },
    validation: 'Projects can be published or unpublished'
  }
};

const ProgramFeatures: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [editingFeature, setEditingFeature] = useState<FeatureType | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const { data, isLoading, error, refetch } = useGetProgramFeaturesQuery(programId!, {
    skip: !programId,
  });
  
  const { data: programInfo } = useGetPartnerProgramInfoQuery(programId!, {
    skip: !programId,
  });
  
  const [updateFeatures, { isLoading: isUpdating }] = useUpdateProgramFeaturesMutation();

  if (!programId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">Program ID not found in URL</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading program features...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500 mb-2">Error loading program features</p>
          <p className="text-sm text-gray-600">
            {error && 'status' in error && `HTTP ${error.status}: ${error.data?.detail || 'Unknown error'}`}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const features = data?.features || {};
  const featureKeys = Object.keys(features);
  const availableFeatureTypes = Object.keys(FEATURE_DESCRIPTIONS);

  const handleTestUpdate = async () => {
    try {
      // Try the simplest payload with correct wrapper
      const testFeatures = {
        features: {
          CUSTOM_RADIUS_TARGETING: {
            custom_radius: 25,
          },
        },
      };

      console.log('🧪 Test payload:', testFeatures);

      await updateFeatures({
        program_id: programId,
        features: testFeatures,
      }).unwrap();

      toast({
        title: 'Features Updated',
        description: 'Program features updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Update Error',
        description: error.data?.detail || 'Failed to update features',
        variant: 'destructive',
      });
    }
  };


  const handleEditFeature = (featureType: string) => {
    setEditingFeature(featureType as FeatureType);
    setShowEditor(true);
  };

  const handleSaveFeature = async (featureType: FeatureType, featureData: any) => {
    try {
      console.log('🔧 Saving feature:', featureType, 'with data:', featureData);
      
      // Save current scroll position before update
      const scrollY = window.scrollY;
      
      await updateFeatures({
        program_id: programId!,
        features: {
          features: {
            [featureType]: featureData
          }
        }
      }).unwrap();

      setShowEditor(false);
      setEditingFeature(null);

      toast({
        title: 'Feature Updated',
        description: `Settings for ${formatFeatureType(featureType)} saved successfully`,
      });

      // Restore scroll position after a short delay (allow time for re-render)
      setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
        
        // Also try to scroll to the specific feature card
        const featureCard = document.getElementById(`feature-${featureType}`);
        if (featureCard) {
          featureCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Save feature error:', error);
      
      // Extract detailed error from response
      let errorTitle = 'Save Error';
      let errorDescription = 'Failed to save settings';
      
      if (error.data) {
        // Check for Yelp error structure
        if (error.data.error) {
          errorDescription = error.data.error;
          errorTitle = error.data.error_id || 'Yelp API Error';
        } else if (error.data.detail) {
          errorDescription = error.data.detail;
        }
      }
      
      toast({
        title: errorTitle,
        description: (
          <div className="space-y-1">
            <p>{errorDescription}</p>
            {error.data?.error_id && (
              <p className="text-xs opacity-75">Error ID: {error.data.error_id}</p>
            )}
          </div>
        ),
        variant: 'destructive',
      });
    }
  };

  // Function to determine if a feature is active according to Yelp API logic
  const isFeatureActive = (featureType: string, featureData: any): boolean => {
    if (!featureData) return false;
    
    switch (featureType) {
      case 'CUSTOM_RADIUS_TARGETING':
        return featureData.custom_radius !== null && featureData.custom_radius !== undefined;
      case 'CALL_TRACKING':
        return featureData.enabled === true;
      case 'LINK_TRACKING':
        return !!(featureData.website || featureData.menu || featureData.call_to_action);
      case 'CUSTOM_LOCATION_TARGETING':
        return featureData.businesses?.some((b: any) => b.locations?.length > 0) || false;
      case 'NEGATIVE_KEYWORD_TARGETING':
        return featureData.blocked_keywords?.length > 0 || false;
      case 'STRICT_CATEGORY_TARGETING':
        return featureData.enabled === true;
      case 'AD_SCHEDULING':
        return featureData.uses_opening_hours === true;
      case 'CUSTOM_AD_TEXT':
        return !!(featureData.custom_text || featureData.custom_review_id);
      case 'CUSTOM_AD_PHOTO':
        return !!featureData.custom_photo_id;
      case 'AD_GOAL':
        // AD_GOAL is always present, active if not DEFAULT
        return featureData.ad_goal !== 'DEFAULT';
      case 'BUSINESS_LOGO':
        return !!featureData.business_logo_url;
      case 'YELP_PORTFOLIO':
        return featureData.projects?.length > 0 || false;
      case 'BUSINESS_HIGHLIGHTS':
        return featureData.active_business_highlights?.length > 0 || false;
      case 'VERIFIED_LICENSE':
        return featureData.licenses?.length > 0 || false;
      case 'SERVICE_OFFERINGS_TARGETING':
        return featureData.enabled_service_offerings?.length > 0 || false;
      default:
        return true; // Default to active if data exists
    }
  };

  const FeatureCard: React.FC<{ featureType: string; featureData?: any }> = ({ featureType, featureData }) => {
    const description = FEATURE_DESCRIPTIONS[featureType as keyof typeof FEATURE_DESCRIPTIONS];
    const IconComponent = description?.icon || Settings;
    const isPresent = !!featureData;
    const isActive = isFeatureActive(featureType, featureData);
    const isDeactivated = isPresent && !isActive;
    
    // Scroll to this card after save (set by handleSaveFeature)
    const cardRef = React.useRef<HTMLDivElement>(null);

    return (
      <Card 
        id={`feature-${featureType}`}
        ref={cardRef}
        className={`transition-all ${
          isActive ? 'border-green-500' : isPresent ? 'border-orange-300' : 'border-gray-200'
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <IconComponent className={`w-5 h-5 mr-2 ${
                isActive ? 'text-green-600' : 
                isPresent ? 'text-orange-500' : 'text-gray-400'
              }`} />
              {description?.title || featureType}
            </div>
            <div className="flex items-center space-x-2">
              {isActive && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              )}
              {isPresent && !isActive && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Deactivated
                </Badge>
              )}
              {!isPresent && (
                <Badge variant="secondary">
                  Unavailable
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            {description?.description || 'Description unavailable'}
          </p>

          {description?.validation && (
            <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-xs text-yellow-800">
                <strong>Validation:</strong> {description.validation}
              </p>
            </div>
          )}

          {description?.fields && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Fields:</h4>
              {Object.entries(description.fields).map(([field, fieldDesc]) => (
                <div key={field} className="text-xs">
                  <code className="bg-gray-100 px-1 rounded">{field}</code>: {fieldDesc}
                </div>
              ))}
            </div>
          )}

          {/* Feature Action Buttons */}
          <div className="mt-4 space-y-2">
            {/* Edit Feature Button */}
            {isPresent && (
              <Button 
                onClick={() => handleEditFeature(featureType)}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <Settings className="w-4 h-4" />
                {isActive ? 'Configure Feature' : 'Configure and Activate'}
              </Button>
            )}

            {/* Special Portfolio Management Button */}
            {featureType === 'YELP_PORTFOLIO' && (
              <Button 
                onClick={() => navigate(`/portfolio/${programId}`)}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <FolderOpen className="w-4 h-4" />
                Manage Portfolio
              </Button>
            )}
          </div>

          {featureType === 'YELP_PORTFOLIO' && (
            <p className="text-xs text-gray-500 mt-1 text-center">
              Create, edit projects and upload photos
            </p>
          )}

          {isPresent && featureData && (
            <details className="mt-3">
              <summary className="text-sm font-medium cursor-pointer">
                Current Data {isActive ? '(active)' : '(deactivated)'}
              </summary>
              <pre className={`text-xs p-2 rounded mt-2 overflow-auto ${
                isActive ? 'bg-green-50' : 'bg-orange-50'
              }`}>
                {JSON.stringify(featureData, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="mr-2" />
            Program Features API
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Program Features Management {programId}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Program Information */}
      <Card>
        <CardHeader>
          <CardTitle>Program Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Program ID:</strong>
              <p className="font-mono text-xs break-all">{data?.program_id}</p>
            </div>
            <div>
              <strong>Program Type:</strong>
              <p>{data?.program_type}</p>
            </div>
            {programInfo?.start_date && (
              <div>
                <strong>Start Date:</strong>
                <p>{programInfo.start_date}</p>
              </div>
            )}
            {programInfo?.end_date && (
              <div>
                <strong>End Date:</strong>
                <p>{programInfo.end_date}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">All Program Features ({featureKeys.length})</TabsTrigger>
          <TabsTrigger value="available">All Available Types ({availableFeatureTypes.length})</TabsTrigger>
          <TabsTrigger value="documentation">API Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {featureKeys.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                No active features
              </p>
              <p className="text-sm text-gray-500">
                Features for this {data?.program_type} program type are not supported
                or not yet configured.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {featureKeys.map((featureKey) => (
                <FeatureCard 
                  key={featureKey} 
                  featureType={featureKey} 
                  featureData={features[featureKey]} 
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            All feature types supported by Yelp Program Features API:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {availableFeatureTypes.map((featureType) => (
              <FeatureCard 
                key={featureType} 
                featureType={featureType} 
                featureData={features[featureType]} 
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yelp Program Features API - Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">📋 Key Endpoints:</h3>
                <div className="space-y-2 text-sm">
                  <div><Badge variant="outline">GET</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Retrieve feature status</div>
                  <div><Badge variant="outline">POST</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Create/update features</div>
                  <div><Badge variant="outline">DELETE</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Delete/deactivate features</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🔧 API Behavior:</h3>
                <ul className="text-sm space-y-1">
                  <li>• GET returns only feature types supported by the program</li>
                  <li>• POST can <strong>activate</strong> and update any subset of features at once</li>
                  <li>• DELETE <strong>deactivates</strong> features (sets null/empty values)</li>
                  <li>• If the program doesn't support a feature type, an error is returned</li>
                  <li>• Response is always identical to GET (current feature state)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">⚠️ Important Limitations:</h3>
                <ul className="text-sm space-y-1">
                  <li>• <code>CUSTOM_AD_TEXT</code>: only one field, either custom_text or custom_review_id</li>
                  <li>• <code>CUSTOM_LOCATION_TARGETING</code>: maximum 25 locations per business, US only</li>
                  <li>• <code>CUSTOM_RADIUS_TARGETING</code>: 1-60 miles or null</li>
                  <li>• <code>AD_GOAL</code>: only DEFAULT, CALLS, WEBSITE_CLICKS</li>
                  <li>• <code>BUSINESS_LOGO</code>: public URL with type jpeg/png/gif/tiff</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🔗 Resources:</h3>
                <div className="space-y-1 text-sm">
                  <a 
                    href="https://docs.developer.yelp.com/reference/retrieve-program-feature" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    📖 Retrieve Program Feature
                  </a>
                  <a 
                    href="https://docs.developer.yelp.com/reference/add-program-feature" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    📝 Add Program Feature  
                  </a>
                  <a 
                    href="https://docs.developer.yelp.com/reference/delete-program-feature" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    🗑️ Delete Program Feature
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Testing the program features API:
                </p>
                <Button
                  onClick={handleTestUpdate}
                  disabled={isUpdating}
                  className="w-full"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Test POST: set radius to 25 miles
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Editor Dialog */}
      <FeatureEditorManager
        featureType={editingFeature}
        featureData={editingFeature ? features?.[editingFeature] : undefined}
        programId={programId!}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingFeature(null);
        }}
        onSave={handleSaveFeature}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default ProgramFeatures;