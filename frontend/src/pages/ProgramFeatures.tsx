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
  useDeleteProgramFeaturesMutation
} from '../store/api/yelpApi';
import { 
  Loader2, Settings, Save, Trash2, Info, 
  Globe, Phone, Camera, MapPin, Clock, 
  Target, Shield, Star, Award, Link, FolderOpen
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Детальні описи всіх типів Program Features згідно документації Yelp
const FEATURE_DESCRIPTIONS = {
  LINK_TRACKING: {
    icon: Link,
    title: 'Відстеження посилань',
    description: 'Налаштування параметрів відстеження для веб-сайту, меню та CTA кнопок',
    fields: {
      website: 'URL або параметри відстеження для посилання на веб-сайт',
      menu: 'URL або параметри відстеження для посилання на меню',
      url: 'URL або параметри відстеження для CTA кнопки'
    },
    validation: 'Усі поля можуть бути null для вимкнення відстеження'
  },

  NEGATIVE_KEYWORD_TARGETING: {
    icon: Target,
    title: 'Негативні ключові слова',
    description: 'Управління ключовими словами, за якими ваша реклама НЕ повинна показуватися',
    fields: {
      suggested_keywords: 'Список рекомендованих ключових слів (до 25, тільки для довідки)',
      blocked_keywords: 'Список заблокованих ключових слів (можна додавати власні)'
    },
    validation: 'Рекомендовані слова - тільки довідкові, реклама може показуватися за словами, не включеними в список'
  },

  STRICT_CATEGORY_TARGETING: {
    icon: Shield,
    title: 'Строге таргетування за категоріями',
    description: 'Включення/вимкнення строгого таргетування за бізнес-категоріями',
    fields: {
      enabled: 'Увімкнути строге таргетування (true/false)'
    },
    validation: 'Логічне значення для увімкнення/вимкнення функції'
  },

  AD_SCHEDULING: {
    icon: Clock,
    title: 'Розклад показу реклами',
    description: 'Налаштування часу показу реклами відповідно до годин роботи бізнесу',
    fields: {
      uses_opening_hours: 'Показувати рекламу тільки в години роботи (true/false)'
    },
    validation: 'Якщо true і години роботи 8-17, то о 18:00 реклама показуватися не буде'
  },

  CUSTOM_LOCATION_TARGETING: {
    icon: MapPin,
    title: 'Власне географічне таргетування',
    description: 'Налаштування конкретних локацій для показу реклами',
    fields: {
      businesses: 'Список бізнесів у рекламній кампанії',
      'businesses[].business_id': 'ID бізнесу',
      'businesses[].locations': 'Список локацій (до 25 на бізнес): ZIP-коди, міста, округи, штати (тільки США)'
    },
    validation: 'Максимум 25 локацій на бізнес, тільки локації в США'
  },

  AD_GOAL: {
    icon: Target,
    title: 'Ціль реклами',
    description: 'Визначення основної цілі рекламної кампанії',
    fields: {
      ad_goal: 'Ціль реклами: DEFAULT, CALLS або WEBSITE_CLICKS'
    },
    validation: 'Має бути одним з трьох значень: DEFAULT, CALLS, WEBSITE_CLICKS'
  },

  CALL_TRACKING: {
    icon: Phone,
    title: 'Відстеження дзвінків',
    description: 'Налаштування відстеження телефонних дзвінків з реклами',
    fields: {
      enabled: 'Увімкнути відстеження дзвінків на рівні кампанії',
      businesses: 'Список бізнесів у кампанії',
      'businesses[].business_id': 'ID бізнесу',
      'businesses[].metered_phone_number': 'Номер телефону для відстеження (null для вимкнення)'
    },
    validation: 'Номер телефону може бути null для відключення відстеження для конкретного бізнесу'
  },

  SERVICE_OFFERINGS_TARGETING: {
    icon: Star,
    title: 'Таргетування за послугами',
    description: 'Управління послугами, які включені/виключені з реклами (застарілий)',
    fields: {
      disabled_service_offerings: 'Список вимкнених послуг для кампанії',
      enabled_service_offerings: 'Список увімкнених послуг для кампанії'
    },
    validation: 'Застарілий тип, рекомендується використовувати негативні ключові слова'
  },

  BUSINESS_HIGHLIGHTS: {
    icon: Star,
    title: 'Підкреслення бізнесу',
    description: 'Управління особливостями бізнесу, що підкреслюються в рекламі',
    fields: {
      active_business_highlights: 'Активні підкреслення бізнесу',
      available_business_highlights: 'Доступні для вибору підкреслення',
      mutually_exclusive_business_highlights: 'Пари підкреслень, що не можуть бути активними одночасно'
    },
    validation: 'Деякі підкреслення є взаємовиключними'
  },

  VERIFIED_LICENSE: {
    icon: Award,
    title: 'Перевірені ліцензії',
    description: 'Управління перевіреними ліцензіями бізнесу',
    fields: {
      'licenses[].license_number': 'Номер ліцензії',
      'licenses[].license_expiry_date': 'Дата закінчення ліцензії (YYYY-MM-DD)',
      'licenses[].license_trade': 'Бізнес або сфера, для якої видана ліцензія',
      'licenses[].license_issuing_agency': 'Орган, що видав ліцензію',
      'licenses[].license_verification_status': 'Статус перевірки: PENDING, VERIFIED, REJECTED',
      'licenses[].license_verification_failure_reason': 'Причина невдалої перевірки'
    },
    validation: 'Статус перевірки обов\'язковий, дата може бути опціональною'
  },

  CUSTOM_RADIUS_TARGETING: {
    icon: MapPin,
    title: 'Власний радіус таргетування',
    description: 'Налаштування конкретного радіуса показу реклами навколо бізнесу',
    fields: {
      custom_radius: 'Радіус у милях (1-60) або null для вимкнення'
    },
    validation: 'Значення від 1 до 60 миль, null означає вимкнену функцію'
  },

  CUSTOM_AD_TEXT: {
    icon: Info,
    title: 'Власний текст реклами',
    description: 'Налаштування власного тексту або використання тексту з відгуків',
    fields: {
      custom_review_id: 'ID відгуку для витягання тексту',
      custom_text: 'Власний текст реклами'
    },
    validation: 'Тільки одне поле може бути заповнене, інше має бути null. За замовчуванням текст встановлює Yelp'
  },

  CUSTOM_AD_PHOTO: {
    icon: Camera,
    title: 'Власне фото реклами',
    description: 'Налаштування власного фото для показу в рекламі',
    fields: {
      custom_photo_id: 'ID фото для показу в рекламі або null для вимкнення'
    },
    validation: 'ID має посилатися на існуюче фото бізнесу'
  },

  BUSINESS_LOGO: {
    icon: Camera,
    title: 'Логотип бізнесу',
    description: 'Налаштування логотипу бренду для використання в рекламі',
    fields: {
      business_logo_url: 'URL логотипу бізнесу'
    },
    validation: 'URL має бути публічно доступним зображенням типу: jpeg/png/gif/tiff'
  },

  YELP_PORTFOLIO: {
    icon: Globe,
    title: 'Портфоліо Yelp',
    description: 'Управління проектами портфоліо для показу в рекламі',
    fields: {
      'projects[].project_id': 'ID проекту',
      'projects[].published': 'Чи опублікований проект (true/false)'
    },
    validation: 'Проекти можуть бути опублікованими або неопублікованими'
  }
};

const ProgramFeatures: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDeactivatedFeatures, setSelectedDeactivatedFeatures] = useState<string[]>([]);
  const [editingFeature, setEditingFeature] = useState<FeatureType | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const { data, isLoading, error, refetch } = useGetProgramFeaturesQuery(programId!, {
    skip: !programId,
  });
  
  const [updateFeatures, { isLoading: isUpdating }] = useUpdateProgramFeaturesMutation();
  const [deleteFeatures, { isLoading: isDeleting }] = useDeleteProgramFeaturesMutation();

  if (!programId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">Program ID не знайден в URL</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Завантаження функцій програми...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500 mb-2">Помилка завантаження функцій програми</p>
          <p className="text-sm text-gray-600">
            {error && 'status' in error && `HTTP ${error.status}: ${error.data?.detail || 'Невідома помилка'}`}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Повторити
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
      // Спробуємо найпростіший payload з правильним wrapper
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
        title: 'Функції оновлені',
        description: 'Функції програми успішно оновлені',
      });
    } catch (error: any) {
      toast({
        title: 'Помилка оновлення',
        description: error.data?.detail || 'Не вдалося оновити функції',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFeatures.length === 0) {
      toast({
        title: 'Нічого не вибрано',
        description: 'Виберіть функції для деактивації',
        variant: 'destructive',
      });
      return;
    }

    console.log('🗑️ Deactivating features:', selectedFeatures);

    try {
      const result = await deleteFeatures({
        program_id: programId,
        features: selectedFeatures,
      }).unwrap();

      console.log('✅ Delete API response:', result);
      
      // Принудово оновлюємо дані з сервера
      await refetch();

      setSelectedFeatures([]);
      toast({
        title: 'Функції деактивовані',
        description: `Yelp API деактивував ${selectedFeatures.length} функцій`,
      });
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      toast({
        title: 'Помилка деактивації',
        description: error.data?.detail || 'Не вдалося деактивувати функції',
        variant: 'destructive',
      });
    }
  };

  const toggleFeatureSelection = (featureType: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureType) 
        ? prev.filter(f => f !== featureType)
        : [...prev, featureType]
    );
  };

  const toggleDeactivatedFeatureSelection = (featureType: string) => {
    setSelectedDeactivatedFeatures(prev => 
      prev.includes(featureType) 
        ? prev.filter(f => f !== featureType)
        : [...prev, featureType]
    );
  };

  // Дефолтні значення для активації функцій згідно з Yelp API специфікацією
  const getDefaultFeatureValue = (featureType: string) => {
    switch (featureType) {
      case 'CUSTOM_RADIUS_TARGETING':
        // Радіус в милях (1-60), null означає неактивна
        return { custom_radius: 25 };
        
      case 'CALL_TRACKING':
        // CALL_TRACKING вимагає business_id і metered_phone_number (string|null)
        const existingBusinessId = features.CALL_TRACKING?.businesses?.[0]?.business_id || 'xrPncND82FtoH4_-7LZrxg';
        return { 
          enabled: true, 
          businesses: [{ 
            business_id: existingBusinessId,
            metered_phone_number: null // За специфікацією це обов'язкове поле
          }] 
        };
        
      case 'LINK_TRACKING':
        // Всі поля мають бути null для деактивації, або містити значення
        return { 
          website: 'https://example.com/track',
          menu: null,
          call_to_action: null
        };
        
      case 'CUSTOM_LOCATION_TARGETING':
        // Вимагає business_id і локації (до 25 на бізнес, тільки США)
        const existingBusinessIdForLocation = features.CUSTOM_LOCATION_TARGETING?.businesses?.[0]?.business_id || 'xrPncND82FtoH4_-7LZrxg';
        return { 
          businesses: [{ 
            business_id: existingBusinessIdForLocation, 
            locations: ['New York, NY'] 
          }] 
        };
        
      case 'NEGATIVE_KEYWORD_TARGETING':
        // blocked_keywords порожній = деактивована функція
        return { 
          blocked_keywords: ['spam', 'fake'],
          suggested_keywords: [] // Тільки для читання, ігнорується в POST
        };
        
      case 'STRICT_CATEGORY_TARGETING':
        return { enabled: true };
        
      case 'AD_SCHEDULING':
        return { uses_opening_hours: true };
        
      case 'CUSTOM_AD_TEXT':
        // Тільки одне поле може бути встановлене, мін. 15 символів, макс 1500
        return { 
          custom_text: 'Custom promotional text for this business',
          custom_review_id: null
        };
        
      case 'AD_GOAL':
        // Має бути одним з: DEFAULT, CALLS, WEBSITE_CLICKS
        return { ad_goal: 'WEBSITE_CLICKS' };
        
      case 'BUSINESS_HIGHLIGHTS':
        // POST використовує business_highlights, а не active_business_highlights
        return { business_highlights: [] }; // Треба реальні значення
        
      case 'VERIFIED_LICENSE':
        // Не можна відправляти порожній список, пропустимо
        return null; // Буде відфільтровано
        
      case 'CUSTOM_AD_PHOTO':
        // Потрібен реальний photo_id
        return null; // Буде відфільтровано
        
      case 'BUSINESS_LOGO':
        // Потрібен публічний URL зображення
        return null; // Буде відфільтровано
        
      case 'YELP_PORTFOLIO':
        // Потрібні реальні project_id
        return null; // Буде відфільтровано
        
      default:
        return null; // Буде відфільтровано
    }
  };

  const handleActivateSelected = async () => {
    if (selectedDeactivatedFeatures.length === 0) {
      toast({
        title: 'Нічого не вибрано',
        description: 'Виберіть деактивовані функції для активації',
        variant: 'destructive',
      });
      return;
    }

    console.log('🔄 Activating features:', selectedDeactivatedFeatures);

    try {
      // Створюємо payload з дефолтними значеннями для активації
      const featuresPayload = {
        features: selectedDeactivatedFeatures.reduce((acc, featureType) => {
          const defaultValue = getDefaultFeatureValue(featureType);
          if (defaultValue !== null) {
            acc[featureType] = defaultValue;
          }
          return acc;
        }, {} as any)
      };

      // Перевіряємо чи є валідні функції для активації
      if (Object.keys(featuresPayload.features).length === 0) {
        toast({
          title: 'Неможливо активувати',
          description: 'Вибрані функції потребують додаткових даних (фото ID, URL, тощо)',
          variant: 'destructive',
        });
        return;
      }

      console.log('📝 Activation payload:', featuresPayload);

      const result = await updateFeatures({
        program_id: programId,
        features: featuresPayload,
      }).unwrap();

      console.log('✅ Activation API response:', result);
      
      // Принудово оновлюємо дані з сервера
      await refetch();

      setSelectedDeactivatedFeatures([]);
      toast({
        title: 'Функції активовані',
        description: `Успішно активовано ${selectedDeactivatedFeatures.length} функцій`,
      });
    } catch (error: any) {
      console.error('❌ Activation error:', error);
      toast({
        title: 'Помилка активації',
        description: error.data?.detail || 'Не вдалося активувати функції',
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
        title: 'Функцію оновлено',
        description: `Налаштування ${featureType.replace(/_/g, ' ')} збережено успішно`,
      });
    } catch (error: any) {
      console.error('❌ Save feature error:', error);
      toast({
        title: 'Помилка збереження',
        description: error.data?.detail || 'Не вдалося зберегти налаштування',
        variant: 'destructive',
      });
    }
  };

  // Функція для визначення чи функція активна згідно з логікою Yelp API
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
        // AD_GOAL завжди присутня, активна якщо не DEFAULT
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
        return true; // За замовчуванням вважаємо активною якщо дані є
    }
  };

  const FeatureCard: React.FC<{ featureType: string; featureData?: any }> = ({ featureType, featureData }) => {
    const description = FEATURE_DESCRIPTIONS[featureType as keyof typeof FEATURE_DESCRIPTIONS];
    const IconComponent = description?.icon || Settings;
    const isPresent = !!featureData;
    const isActive = isFeatureActive(featureType, featureData);
    const isDeactivated = isPresent && !isActive;
    const isSelected = selectedFeatures.includes(featureType);
    const isDeactivatedSelected = selectedDeactivatedFeatures.includes(featureType);

    return (
      <Card 
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-blue-500' : 
          isDeactivatedSelected ? 'ring-2 ring-orange-500' : ''
        } ${isActive ? 'border-green-500' : isPresent ? 'border-orange-300' : 'border-gray-200'}`}
        onClick={() => {
          if (isActive) {
            toggleFeatureSelection(featureType);
          } else if (isDeactivated) {
            toggleDeactivatedFeatureSelection(featureType);
          }
        }}
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
                  Активна
                </Badge>
              )}
              {isPresent && !isActive && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Деактивована {isDeactivatedSelected ? '(вибрана)' : ''}
                </Badge>
              )}
              {!isPresent && (
                <Badge variant="secondary">
                  Недоступна
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            {description?.description || 'Опис недоступний'}
          </p>
          
          {description?.validation && (
            <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-xs text-yellow-800">
                <strong>Валідація:</strong> {description.validation}
              </p>
            </div>
          )}

          {description?.fields && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Поля:</h4>
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
                {isActive ? 'Налаштувати фічу' : 'Налаштувати та активувати'}
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
                Керувати портфоліо
              </Button>
            )}
          </div>

          {featureType === 'YELP_PORTFOLIO' && (
            <p className="text-xs text-gray-500 mt-1 text-center">
              Створюйте, редагуйте проєкти та завантажуйте фото
            </p>
          )}

          {isPresent && featureData && (
            <details className="mt-3">
              <summary className="text-sm font-medium cursor-pointer">
                Поточні дані {isActive ? '(активна)' : '(деактивована)'}
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
            Управління функціями програми {programId}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Оновити
        </Button>
      </div>

      {/* Інформація про програму */}
      <Card>
        <CardHeader>
          <CardTitle>Інформація про програму</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Program ID:</strong>
              <p className="font-mono text-xs break-all">{data?.program_id}</p>
            </div>
            <div>
              <strong>Тип програми:</strong>
              <p>{data?.program_type}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Всі функції програми ({featureKeys.length})</TabsTrigger>
          <TabsTrigger value="available">Всі доступні типи ({availableFeatureTypes.length})</TabsTrigger>
          <TabsTrigger value="documentation">Документація API</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {selectedFeatures.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm">
                    Вибрано {selectedFeatures.length} активних функцій для деактивації
                  </p>
                  <div className="space-x-2">
                    <Button 
                      onClick={() => setSelectedFeatures([])}
                      variant="outline"
                      size="sm"
                    >
                      Скасувати
                    </Button>
                    <Button 
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      variant="destructive"
                      size="sm"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Деактивувати
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedDeactivatedFeatures.length > 0 && (
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm">
                    Вибрано {selectedDeactivatedFeatures.length} деактивованих функцій для активації
                  </p>
                  <div className="space-x-2">
                    <Button 
                      onClick={() => setSelectedDeactivatedFeatures([])}
                      variant="outline"
                      size="sm"
                    >
                      Скасувати
                    </Button>
                    <Button 
                      onClick={handleActivateSelected}
                      disabled={isUpdating}
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Активувати
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {featureKeys.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                Немає активних функцій
              </p>
              <p className="text-sm text-gray-500">
                Для цієї програми типу {data?.program_type} функції не підтримуються
                або поки не налаштовані.
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
            Всі типи функцій, підтримувані Yelp Program Features API:
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
              <CardTitle>Yelp Program Features API - Документація</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">📋 Основні ендпоінти:</h3>
                <div className="space-y-2 text-sm">
                  <div><Badge variant="outline">GET</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Отримати стан функцій</div>
                  <div><Badge variant="outline">POST</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Створити/оновити функції</div>
                  <div><Badge variant="outline">DELETE</Badge> <code>/program/{'{program_id}'}/features/v1</code> - Видалити/вимкнути функції</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🔧 Поведінка API:</h3>
                <ul className="text-sm space-y-1">
                  <li>• GET повертає тільки підтримувані програмою типи функцій</li>
                  <li>• POST може <strong>активувати</strong> та оновлювати будь-яку підмножину функцій за раз</li>
                  <li>• DELETE <strong>деактивує</strong> функції (встановлює null/порожні значення)</li>
                  <li>• Якщо програма не підтримує тип функції - повертається помилка</li>
                  <li>• Відповідь завжди ідентична GET (поточний стан функцій)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">⚠️ Важливі обмеження:</h3>
                <ul className="text-sm space-y-1">
                  <li>• <code>CUSTOM_AD_TEXT</code>: тільки одне поле з custom_text або custom_review_id</li>
                  <li>• <code>CUSTOM_LOCATION_TARGETING</code>: максимум 25 локацій на бізнес, тільки США</li>
                  <li>• <code>CUSTOM_RADIUS_TARGETING</code>: 1-60 миль або null</li>
                  <li>• <code>AD_GOAL</code>: тільки DEFAULT, CALLS, WEBSITE_CLICKS</li>
                  <li>• <code>BUSINESS_LOGO</code>: публічний URL з типом jpeg/png/gif/tiff</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🔗 Джерела:</h3>
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

          {/* Тестові дії */}
          <Card>
            <CardHeader>
              <CardTitle>Тестові дії</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Тестування API функцій програми:
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
                  Тест POST: встановити радіус 25 миль
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