import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LinkTrackingEditor from './LinkTrackingEditor';
import AdGoalEditor from './AdGoalEditor';
import NegativeKeywordEditor from './NegativeKeywordEditor';
import CustomRadiusEditor from './CustomRadiusEditor';
import CustomAdTextEditor from './CustomAdTextEditor';
import CustomLocationEditor from './CustomLocationEditor';
import CallTrackingEditor from './CallTrackingEditor';
import BusinessLogoEditor from './BusinessLogoEditor';
import CustomAdPhotoEditor from './CustomAdPhotoEditor';
import YelpPortfolioEditor from './YelpPortfolioEditor';
import BusinessHighlightsEditor from './BusinessHighlightsEditor';
import ServiceOfferingsEditor from './ServiceOfferingsEditor';
import VerifiedLicenseEditor from './VerifiedLicenseEditor';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { formatFeatureType } from '@/lib/utils';

export type FeatureType = 
  | 'LINK_TRACKING'
  | 'AD_GOAL'
  | 'NEGATIVE_KEYWORD_TARGETING'
  | 'CUSTOM_RADIUS_TARGETING'
  | 'CUSTOM_AD_TEXT'
  | 'STRICT_CATEGORY_TARGETING'
  | 'AD_SCHEDULING'
  | 'CUSTOM_LOCATION_TARGETING'
  | 'CALL_TRACKING'
  | 'SERVICE_OFFERINGS_TARGETING'
  | 'BUSINESS_HIGHLIGHTS'
  | 'VERIFIED_LICENSE'
  | 'CUSTOM_AD_PHOTO'
  | 'BUSINESS_LOGO'
  | 'YELP_PORTFOLIO';

interface FeatureEditorManagerProps {
  featureType: FeatureType | null;
  featureData?: any;
  programId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (featureType: FeatureType, data: any) => void;
  isLoading?: boolean;
}

const FeatureEditorManager: React.FC<FeatureEditorManagerProps> = ({
  featureType,
  featureData,
  programId,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const handleSave = (data: any) => {
    if (featureType) {
      onSave(featureType, data);
    }
  };

  const renderEditor = () => {
    if (!featureType) return null;

    switch (featureType) {
      case 'LINK_TRACKING':
        return (
          <LinkTrackingEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'AD_GOAL':
        return (
          <AdGoalEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'NEGATIVE_KEYWORD_TARGETING':
        return (
          <NegativeKeywordEditor
            data={featureData}
            programId={programId}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'CUSTOM_RADIUS_TARGETING':
        return (
          <CustomRadiusEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'CUSTOM_AD_TEXT':
        return (
          <CustomAdTextEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'CUSTOM_LOCATION_TARGETING':
        return (
          <CustomLocationEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'CALL_TRACKING':
        return (
          <CallTrackingEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'BUSINESS_LOGO':
        return (
          <BusinessLogoEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'CUSTOM_AD_PHOTO':
        return (
          <CustomAdPhotoEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'YELP_PORTFOLIO':
        return (
          <YelpPortfolioEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'BUSINESS_HIGHLIGHTS':
        return (
          <BusinessHighlightsEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'SERVICE_OFFERINGS_TARGETING':
        return (
          <ServiceOfferingsEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'VERIFIED_LICENSE':
        return (
          <VerifiedLicenseEditor
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      // For simple features, create a basic editor
      case 'STRICT_CATEGORY_TARGETING':
        return (
          <SimpleToggleEditor
            featureType={featureType}
            title="Precise category targeting"
            description="Show ads only in your business's exact category"
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        );

      case 'AD_SCHEDULING':
        return (
          <SimpleToggleEditor
            featureType={featureType}
            title="Ad scheduling"
            description="Show ads only during business hours"
            data={featureData}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
            fieldName="uses_opening_hours"
          />
        );

      default:
        return (
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Editor under development</h3>
              <p className="text-gray-600 mb-4">
                A graphical editor for {featureType} is still being developed.
              </p>
              <p className="text-sm text-gray-500">
                For now, you can configure this feature via JSON in the main interface.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-fit max-h-[90vh] overflow-y-auto" aria-describedby="feature-editor-description">
        <DialogHeader>
          <DialogTitle>
            Feature settings: {featureType && formatFeatureType(featureType)}
          </DialogTitle>
        </DialogHeader>
        <div id="feature-editor-description" className="sr-only">
          Graphical editor for configuring Yelp Ads program features
        </div>
        <div className="mt-4">
          {renderEditor()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Simple editor for toggle features
interface SimpleToggleEditorProps {
  featureType: string;
  title: string;
  description: string;
  data?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  fieldName?: string;
}

const SimpleToggleEditor: React.FC<SimpleToggleEditorProps> = ({
  featureType,
  title,
  description,
  data,
  onSave,
  onCancel,
  isLoading = false,
  fieldName = 'enabled'
}) => {
  const isEnabled = data?.[fieldName] || false;

  const handleToggle = (enabled: boolean) => {
    onSave({ [fieldName]: enabled });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="toggle"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="toggle" className="font-medium">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => handleToggle(!isEnabled)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '⏳ Saving...' : `${isEnabled ? 'Disable' : 'Enable'} feature`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureEditorManager;
