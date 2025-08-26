# Program Features and Portfolio API Implementation

This document describes the complete implementation of the Yelp Partner Program Features API and Portfolio API in your Django application.

## Overview

The implementation provides full support for:
1. **Program Features API** - Manage feature configurations for Yelp advertising programs
2. **Portfolio API** - Manage portfolio projects and photos for business portfolios

## Components Implemented

### 1. Database Models (`backend/ads/models.py`)

#### ProgramFeature Model
Stores program feature configurations with support for all 14 feature types:
- `program_id` - Links to the advertising program
- `feature_type` - Type of feature (LINK_TRACKING, AD_GOAL, etc.)
- `configuration` - JSON field storing feature-specific settings
- `is_active` - Whether the feature is currently active

#### PortfolioProject Model
Stores portfolio project information:
- `project_id` - Unique project identifier
- `program_id` - Associated program
- `name`, `description` - Project details
- `call_to_action` - Action type (WEBSITE, CALL, etc.)
- `service_offerings` - Up to 4 service offerings
- `cost`, `duration` - Project attributes
- `completion_year`, `completion_month` - When project was completed
- `published` - Whether project is published

#### PortfolioPhoto Model
Stores portfolio project photos:
- `photo_id` - Unique photo identifier
- `project` - Foreign key to PortfolioProject
- `photo_url` or `biz_photo_id` - Photo source (external URL or Yelp business photo)
- `caption` - Photo description
- `is_before_photo` - Whether this is a "before" photo
- `is_cover_photo` - Whether this is the project cover photo

### 2. Service Layer (`backend/ads/services.py`)

#### Enhanced YelpService Methods

**Program Features:**
- `get_program_features(program_id)` - Retrieve features for a program
- `update_program_features(program_id, features_payload)` - Update program features
- `delete_program_features(program_id, features_list)` - Delete specific features

**Portfolio API:**
- `get_portfolio_project(program_id, project_id)` - Get project details
- `update_portfolio_project(program_id, project_id, project_data)` - Update project
- `create_portfolio_project(program_id)` - Create new project draft
- `delete_portfolio_project(program_id, project_id)` - Delete project
- `upload_portfolio_photo(program_id, project_id, photo_data)` - Upload photo
- `get_portfolio_photos(program_id, project_id)` - Get project photos
- `delete_portfolio_photo(program_id, project_id, photo_id)` - Delete photo

### 3. Serializers (`backend/ads/serializers.py`)

#### Feature Type Serializers
Each feature type has its own serializer with validation:
- `LinkTrackingSerializer` - Website, menu, CTA link tracking
- `NegativeKeywordTargetingSerializer` - Keyword blocking
- `StrictCategoryTargetingSerializer` - Category targeting
- `AdSchedulingSerializer` - Opening hours scheduling
- `CustomLocationTargetingSerializer` - Geographic targeting
- `AdGoalSerializer` - Campaign objectives
- `CallTrackingSerializer` - Phone call tracking
- `BusinessHighlightsSerializer` - Business highlights
- `VerifiedLicenseSerializer` - Professional licenses
- `CustomRadiusTargetingSerializer` - Radius-based targeting
- `CustomAdTextSerializer` - Custom ad text with validation
- `CustomAdPhotoSerializer` - Custom ad photos
- `BusinessLogoSerializer` - Business logo with image validation
- `YelpPortfolioSerializer` - Portfolio project management

#### Portfolio Serializers
- `PortfolioProjectSerializer` - Project CRUD operations
- `PortfolioPhotoUploadSerializer` - Photo upload with validation
- `PortfolioPhotoSerializer` - Photo data representation

#### Request/Response Serializers
- `ProgramFeaturesRequestSerializer` - Validates feature updates
- `ProgramFeaturesDeleteSerializer` - Validates feature deletion requests

### 4. API Views (`backend/ads/views.py`)

#### Enhanced ProgramFeaturesView
- **GET** `/program/{program_id}/features/v1` - Retrieve program features
- **POST** `/program/{program_id}/features/v1` - Update program features  
- **DELETE** `/program/{program_id}/features/v1` - Delete program features

#### Portfolio API Views
- **PortfolioProjectCreateView**
  - **POST** `/program/{program_id}/portfolio/v1` - Create new project

- **PortfolioProjectDetailView**
  - **GET** `/program/{program_id}/portfolio/{project_id}/v1` - Get project details
  - **PUT** `/program/{program_id}/portfolio/{project_id}/v1` - Update project
  - **DELETE** `/program/{program_id}/portfolio/{project_id}/v1` - Delete project

- **PortfolioPhotoListView**
  - **GET** `/program/{program_id}/portfolio/{project_id}/photos/v1` - List photos
  - **POST** `/program/{program_id}/portfolio/{project_id}/photos/v1` - Upload photo

- **PortfolioPhotoDetailView**
  - **DELETE** `/program/{program_id}/portfolio/{project_id}/photos/{photo_id}/v1` - Delete photo

### 5. URL Configuration (`backend/ads/urls.py`)

All endpoints are configured to match the Yelp Partner API specification exactly.

## Supported Feature Types

The implementation supports all 14 feature types specified in the Yelp Partner API:

1. **LINK_TRACKING** - Track website, menu, and CTA links
2. **NEGATIVE_KEYWORD_TARGETING** - Block specific search terms
3. **STRICT_CATEGORY_TARGETING** - Precise category targeting
4. **AD_SCHEDULING** - Schedule ads based on business hours
5. **CUSTOM_LOCATION_TARGETING** - Target specific geographic areas
6. **AD_GOAL** - Set campaign objectives (DEFAULT, CALLS, WEBSITE_CLICKS)
7. **CALL_TRACKING** - Track phone calls from ads
8. **BUSINESS_HIGHLIGHTS** - Highlight business features
9. **VERIFIED_LICENSE** - Display professional licenses
10. **CUSTOM_RADIUS_TARGETING** - Set custom radius (1-60 miles)
11. **CUSTOM_AD_TEXT** - Custom ad text with content validation
12. **CUSTOM_AD_PHOTO** - Custom ad photos
13. **BUSINESS_LOGO** - Business branding logo
14. **YELP_PORTFOLIO** - Portfolio project management

## Validation Features

### Feature-Specific Validation
- **Custom Ad Text**: Length limits (15-1500 chars), no URLs, capital letter limits
- **Business Logo**: Valid image file type validation (jpeg, png, gif, tiff)
- **Custom Radius**: 1-60 mile range validation
- **Location Targeting**: Up to 25 locations per business
- **Service Offerings**: Maximum 4 per portfolio project

### Request Validation
- Comprehensive payload validation for all feature types
- Proper error handling with specific error messages
- Serializer-based validation for type safety

## Error Handling

The implementation includes robust error handling:
- HTTP 400 for invalid data with detailed error messages
- HTTP 404 for non-existent programs/projects/photos
- Proper logging for debugging and monitoring
- Graceful degradation for API failures

## Authentication

Uses the existing Basic HTTP Authentication over SSL, leveraging your current credential management system.

## Next Steps

To complete the integration:

1. **Run Migrations**: 
   ```bash
   cd backend && python manage.py makemigrations ads
   cd backend && python manage.py migrate
   ```

2. **Test the Endpoints**: Use your existing API testing setup to verify functionality

3. **Frontend Integration**: Update your React frontend to use the new Portfolio API endpoints

4. **Documentation**: The API follows the exact specification provided, so existing Yelp Partner API documentation applies

## Example Usage

### Update Program Features
```bash
POST /program/PROG123/features/v1
{
  "features": {
    "LINK_TRACKING": {
      "website": "https://example.com?utm_source=yelp",
      "menu": null,
      "call_to_action": "https://example.com/contact?utm_source=yelp"
    },
    "AD_GOAL": {
      "ad_goal": "WEBSITE_CLICKS"
    }
  }
}
```

### Create Portfolio Project
```bash
POST /program/PROG123/portfolio/v1
# Returns: {"project_id": "PROJECT456"}
```

### Upload Portfolio Photo
```bash
POST /program/PROG123/portfolio/PROJECT456/photos/v1
{
  "photo_url": "https://example.com/photo.jpg",
  "is_before_photo": false,
  "caption": "Completed kitchen renovation"
}
```

The implementation is now complete and ready for use!
