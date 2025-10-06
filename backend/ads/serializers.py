from rest_framework import serializers
from .models import Program, Report, ProgramFeature, PortfolioProject, PortfolioPhoto, CustomSuggestedKeyword
import re

class ProgramSerializer(serializers.ModelSerializer):
    program_id = serializers.SerializerMethodField()
    partner_program_id = serializers.CharField()
    job_id = serializers.CharField()
    product_type = serializers.CharField(source='name')
    budget_amount = serializers.DecimalField(source='budget', max_digits=12, decimal_places=2)
    created_date = serializers.DateTimeField(source='created_at')
    modified_date = serializers.DateTimeField(source='updated_at')
    business_id = serializers.SerializerMethodField()
    start_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True)

    def get_program_id(self, obj):
        return obj.partner_program_id

    def get_business_id(self, obj):
        return ''

    class Meta:
        model = Program
        fields = [
            'program_id',
            'partner_program_id',
            'job_id',
            'business_id',
            'product_type',
            'status',
            'created_date',
            'modified_date',
            'budget_amount',
            'start_date',
            'end_date',
        ]

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'


# ============= Feature Type Serializers =============

class LinkTrackingSerializer(serializers.Serializer):
    """Serializer for LINK_TRACKING feature type"""
    website = serializers.CharField(required=False, allow_null=True)
    menu = serializers.CharField(required=False, allow_null=True)
    url = serializers.CharField(required=False, allow_null=True)


class NegativeKeywordTargetingSerializer(serializers.Serializer):
    """Serializer for NEGATIVE_KEYWORD_TARGETING feature type"""
    suggested_keywords = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    blocked_keywords = serializers.ListField(
        child=serializers.CharField(), required=True
    )


class StrictCategoryTargetingSerializer(serializers.Serializer):
    """Serializer for STRICT_CATEGORY_TARGETING feature type"""
    enabled = serializers.BooleanField(required=True)


class AdSchedulingSerializer(serializers.Serializer):
    """Serializer for AD_SCHEDULING feature type"""
    uses_opening_hours = serializers.BooleanField(required=True)


class CustomLocationTargetingBusinessSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    locations = serializers.ListField(
        child=serializers.CharField(), required=True, max_length=25
    )


class CustomLocationTargetingSerializer(serializers.Serializer):
    """Serializer for CUSTOM_LOCATION_TARGETING feature type"""
    businesses = serializers.ListField(
        child=CustomLocationTargetingBusinessSerializer(), required=True
    )


class AdGoalSerializer(serializers.Serializer):
    """Serializer for AD_GOAL feature type"""
    AD_GOAL_CHOICES = ['DEFAULT', 'CALLS', 'WEBSITE_CLICKS']
    ad_goal = serializers.ChoiceField(choices=AD_GOAL_CHOICES, required=True)


class CallTrackingBusinessSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    metered_phone_number = serializers.CharField(required=False, allow_null=True)


class CallTrackingSerializer(serializers.Serializer):
    """Serializer for CALL_TRACKING feature type"""
    enabled = serializers.BooleanField(required=True)
    businesses = serializers.ListField(
        child=CallTrackingBusinessSerializer(), required=True
    )


class BusinessHighlightsSerializer(serializers.Serializer):
    """Serializer for BUSINESS_HIGHLIGHTS feature type (POST/PUT)"""
    active_business_highlights = serializers.ListField(
        child=serializers.CharField(), required=True
    )
    # For GET response, these fields are populated by Yelp
    available_business_highlights = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    mutually_exclusive_business_highlights = serializers.ListField(
        child=serializers.ListField(child=serializers.CharField()), required=False
    )


class ServiceOfferingsTargetingSerializer(serializers.Serializer):
    """Serializer for SERVICE_OFFERINGS_TARGETING feature type"""
    disabled_service_offerings = serializers.ListField(
        child=serializers.CharField(), required=True
    )
    enabled_service_offerings = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class VerifiedLicenseSerializer(serializers.Serializer):
    """Serializer for individual license in VERIFIED_LICENSE"""
    license_number = serializers.CharField(required=True)
    license_expiry_date = serializers.DateField(required=False, allow_null=True)
    license_trade = serializers.CharField(required=False, allow_null=True)
    license_issuing_agency = serializers.CharField(required=False, allow_null=True)
    license_verification_status = serializers.ChoiceField(
        choices=['PENDING', 'VERIFIED', 'REJECTED'], 
        required=True
    )
    license_verification_failure_reason = serializers.CharField(required=False, allow_null=True)


class VerifiedLicenseListSerializer(serializers.Serializer):
    """Serializer for VERIFIED_LICENSE feature type"""
    licenses = serializers.ListField(
        child=VerifiedLicenseSerializer(), required=True
    )


class CustomRadiusTargetingSerializer(serializers.Serializer):
    """Serializer for CUSTOM_RADIUS_TARGETING feature type"""
    custom_radius = serializers.FloatField(required=False, allow_null=True, min_value=1, max_value=60)


class CustomAdTextSerializer(serializers.Serializer):
    """Serializer for CUSTOM_AD_TEXT feature type"""
    custom_review_id = serializers.CharField(required=False, allow_null=True)
    custom_text = serializers.CharField(required=False, allow_null=True)

    def validate(self, data):
        custom_review_id = data.get('custom_review_id')
        custom_text = data.get('custom_text')
        
        # Only one field can be set
        if custom_review_id and custom_text:
            raise serializers.ValidationError(
                "Only one of custom_review_id or custom_text can be set"
            )
        
        # Validate custom_text requirements
        if custom_text:
            if len(custom_text) < 15:
                raise serializers.ValidationError(
                    "custom_text must be at least 15 characters long"
                )
            if len(custom_text) > 1500:
                raise serializers.ValidationError(
                    "custom_text must not exceed 1500 characters"
                )
            
            # Check for URLs
            url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
            if re.search(url_pattern, custom_text):
                raise serializers.ValidationError(
                    "custom_text cannot contain URLs"
                )
            
            # Check if only numbers
            if custom_text.isdigit():
                raise serializers.ValidationError(
                    "custom_text cannot be only numbers"
                )
            
            # Check for too many capital letters
            uppercase_count = sum(1 for c in custom_text if c.isupper())
            if uppercase_count / len(custom_text) > 0.5:
                raise serializers.ValidationError(
                    "custom_text has too many capital letters"
                )
            
            # Check for too many consecutive capital letters
            consecutive_caps = 0
            max_consecutive = 0
            for char in custom_text:
                if char.isupper():
                    consecutive_caps += 1
                    max_consecutive = max(max_consecutive, consecutive_caps)
                else:
                    consecutive_caps = 0
            
            if max_consecutive > 5:
                raise serializers.ValidationError(
                    "custom_text has too many consecutive capital letters"
                )
        
        return data


class CustomAdPhotoSerializer(serializers.Serializer):
    """Serializer for CUSTOM_AD_PHOTO feature type"""
    custom_photo_id = serializers.CharField(required=False, allow_null=True)


class BusinessLogoSerializer(serializers.Serializer):
    """Serializer for BUSINESS_LOGO feature type"""
    business_logo_url = serializers.URLField(required=False, allow_null=True)
    
    def validate_business_logo_url(self, value):
        if value:
            # Check for valid image file extensions
            valid_extensions = ['.jpeg', '.jpg', '.png', '.gif', '.tiff']
            if not any(value.lower().endswith(ext) for ext in valid_extensions):
                raise serializers.ValidationError(
                    "business_logo_url must point to a valid image file (jpeg, png, gif, tiff)"
                )
        return value


class YelpPortfolioProjectSerializer(serializers.Serializer):
    """Serializer for individual project in YELP_PORTFOLIO"""
    project_id = serializers.CharField(required=True)
    published = serializers.BooleanField(required=True)


class YelpPortfolioSerializer(serializers.Serializer):
    """Serializer for YELP_PORTFOLIO feature type"""
    projects = serializers.ListField(
        child=YelpPortfolioProjectSerializer(), required=True
    )


# ============= Portfolio API Serializers =============

class PortfolioProjectSerializer(serializers.ModelSerializer):
    """Serializer for Portfolio Projects"""
    
    class Meta:
        model = PortfolioProject
        fields = [
            'project_id', 'name', 'description', 'call_to_action',
            'service_offerings', 'cost', 'duration', 'completion_year',
            'completion_month', 'published'
        ]
        read_only_fields = ['project_id']
    
    def validate_service_offerings(self, value):
        if len(value) > 4:
            raise serializers.ValidationError("Maximum 4 service offerings allowed")
        return value
    
    def validate_completion_month(self, value):
        if value and (value < 1 or value > 12):
            raise serializers.ValidationError("completion_month must be between 1 and 12")
        return value


class PortfolioProjectCreateResponseSerializer(serializers.Serializer):
    """Serializer for project creation response"""
    project_id = serializers.CharField()


class PortfolioPhotoSerializer(serializers.ModelSerializer):
    """Serializer for Portfolio Photos"""
    
    class Meta:
        model = PortfolioPhoto
        fields = [
            'photo_id', 'photo_url', 'biz_photo_id', 'caption',
            'is_before_photo', 'is_cover_photo'
        ]
        read_only_fields = ['photo_id', 'is_cover_photo']
    
    def validate(self, data):
        photo_url = data.get('photo_url')
        biz_photo_id = data.get('biz_photo_id')
        
        # Either photo_url or biz_photo_id must be provided, but not both
        if not photo_url and not biz_photo_id:
            raise serializers.ValidationError(
                "Either photo_url or biz_photo_id must be provided"
            )
        if photo_url and biz_photo_id:
            raise serializers.ValidationError(
                "Cannot provide both photo_url and biz_photo_id"
            )
        
        return data


class PortfolioPhotoUploadSerializer(serializers.Serializer):
    """Serializer for photo upload request"""
    photo_url = serializers.URLField(required=False, allow_null=True)
    biz_photo_id = serializers.CharField(required=False, allow_null=True)
    is_before_photo = serializers.BooleanField(required=True)
    caption = serializers.CharField(required=True)
    
    def validate(self, data):
        photo_url = data.get('photo_url')
        biz_photo_id = data.get('biz_photo_id')
        
        # Either photo_url or biz_photo_id must be provided, but not both
        if not photo_url and not biz_photo_id:
            raise serializers.ValidationError(
                "Either photo_url or biz_photo_id must be provided"
            )
        if photo_url and biz_photo_id:
            raise serializers.ValidationError(
                "Cannot provide both photo_url and biz_photo_id"
            )
        
        return data


class PortfolioPhotoUploadResponseSerializer(serializers.Serializer):
    """Serializer for photo upload response"""
    photo_id = serializers.CharField()


# ============= Program Features Serializers =============

class ProgramFeatureSerializer(serializers.ModelSerializer):
    """Main serializer for ProgramFeature model"""
    
    class Meta:
        model = ProgramFeature
        fields = '__all__'


class ProgramFeaturesRequestSerializer(serializers.Serializer):
    """Serializer for Program Features API requests"""
    features = serializers.JSONField()
    
    def validate_features(self, value):
        """Validate features object based on feature types"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("features must be an object")
        
        # Validate each feature type
        for feature_type, feature_data in value.items():
            self._validate_feature_type(feature_type, feature_data)
        
        return value
    
    def _validate_feature_type(self, feature_type, feature_data):
        """Validate individual feature type data"""
        serializer_map = {
            'LINK_TRACKING': LinkTrackingSerializer,
            'NEGATIVE_KEYWORD_TARGETING': NegativeKeywordTargetingSerializer,
            'STRICT_CATEGORY_TARGETING': StrictCategoryTargetingSerializer,
            'AD_SCHEDULING': AdSchedulingSerializer,
            'CUSTOM_LOCATION_TARGETING': CustomLocationTargetingSerializer,
            'AD_GOAL': AdGoalSerializer,
            'CALL_TRACKING': CallTrackingSerializer,
            'SERVICE_OFFERINGS_TARGETING': ServiceOfferingsTargetingSerializer,
            'BUSINESS_HIGHLIGHTS': BusinessHighlightsSerializer,
            'VERIFIED_LICENSE': VerifiedLicenseListSerializer,
            'CUSTOM_RADIUS_TARGETING': CustomRadiusTargetingSerializer,
            'CUSTOM_AD_TEXT': CustomAdTextSerializer,
            'CUSTOM_AD_PHOTO': CustomAdPhotoSerializer,
            'BUSINESS_LOGO': BusinessLogoSerializer,
            'YELP_PORTFOLIO': YelpPortfolioSerializer,
        }
        
        serializer_class = serializer_map.get(feature_type)
        if not serializer_class:
            raise serializers.ValidationError(f"Unknown feature type: {feature_type}")
        
        serializer = serializer_class(data=feature_data)
        if not serializer.is_valid():
            raise serializers.ValidationError({
                feature_type: serializer.errors
            })


class ProgramFeaturesDeleteSerializer(serializers.Serializer):
    """Serializer for deleting program features"""
    features = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        help_text="List of feature types to delete"
    )


# ============= Custom Suggested Keywords Serializers =============

class CustomSuggestedKeywordSerializer(serializers.ModelSerializer):
    """Serializer for custom suggested keywords"""
    
    class Meta:
        model = CustomSuggestedKeyword
        fields = ['id', 'program_id', 'keyword', 'created_at', 'created_by']
        read_only_fields = ['id', 'created_at']


class CustomSuggestedKeywordCreateSerializer(serializers.Serializer):
    """Serializer for creating custom suggested keywords"""
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=True,
        help_text="List of keywords to add as custom suggestions"
    )
    
    def validate_keywords(self, value):
        """Validate keywords list"""
        if not value:
            raise serializers.ValidationError("At least one keyword is required")
        
        # Clean and validate each keyword
        cleaned = []
        for keyword in value:
            kw = keyword.strip().lower()
            if kw:
                if len(kw) > 255:
                    raise serializers.ValidationError(f"Keyword '{kw}' is too long (max 255 characters)")
                cleaned.append(kw)
        
        if not cleaned:
            raise serializers.ValidationError("No valid keywords provided")
        
        return cleaned


class CustomSuggestedKeywordDeleteSerializer(serializers.Serializer):
    """Serializer for deleting custom suggested keywords"""
    keywords = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        help_text="List of keywords to delete"
    )
