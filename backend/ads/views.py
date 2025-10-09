from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
import logging
import uuid
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import models
from .services import YelpService
from .models import Program, PortfolioProject, PortfolioPhoto, PartnerCredential, CustomSuggestedKeyword
from .serializers import (
    ProgramSerializer, ProgramFeaturesRequestSerializer, ProgramFeaturesDeleteSerializer,
    PortfolioProjectSerializer, PortfolioProjectCreateResponseSerializer,
    PortfolioPhotoUploadSerializer, PortfolioPhotoUploadResponseSerializer,
    PortfolioPhotoSerializer, CustomSuggestedKeywordSerializer,
    CustomSuggestedKeywordCreateSerializer, CustomSuggestedKeywordDeleteSerializer
)
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

class CreateProgramView(APIView):
    def post(self, request):
        logger.info(f"Creating program with data: {request.data}")
        try:
            data = YelpService.create_program(request.data)
            logger.info(f"Program created successfully: {data}")
            return Response(data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            logger.error(f"Validation error creating program: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating program: {e}")
            raise

class BusinessMatchView(APIView):
    def get(self, request):
        logger.info(f"Business match request with params: {request.query_params}")
        try:
            data = YelpService.business_match(request.query_params)
            logger.info(f"Business match response: {len(data.get('businesses', []))} businesses found")
            return Response(data)
        except Exception as e:
            logger.error(f"Error in business match: {e}")
            raise

class SyncSpecialtiesView(APIView):
    def post(self, request):
        logger.info(f"Sync specialties request with data: {request.data}")
        try:
            data = YelpService.sync_specialties(request.data)
            logger.info(f"Sync specialties completed successfully")
            return Response(data)
        except Exception as e:
            logger.error(f"Error syncing specialties: {e}")
            raise

class EditProgramView(APIView):
    def post(self, request, program_id):
        logger.info(f"Editing program {program_id} with data: {request.data}")
        try:
            data = YelpService.edit_program(program_id, request.data)
            logger.info(f"Program {program_id} edited successfully")
            return Response(data)
        except Exception as e:
            logger.error(f"Error editing program {program_id}: {e}")
            raise

class TerminateProgramView(APIView):
    def post(self, request, program_id):
        logger.info(f"Terminating program {program_id}")
        try:
            data = YelpService.terminate_program(program_id)
            detail = data.get("detail") if isinstance(data, dict) else None
            if detail:
                logger.warning(f"Program {program_id} not terminated: {detail}")
                status_map = {
                    "PROGRAM_HAS_EXPIRED": status.HTTP_400_BAD_REQUEST,
                    "PROGRAM_NOT_FOUND": status.HTTP_404_NOT_FOUND,
                }
                return Response({"detail": detail}, status=status_map.get(detail, status.HTTP_400_BAD_REQUEST))
            logger.info(f"Program {program_id} terminated successfully")
            return Response(data)
        except Exception as e:
            logger.error(f"Error terminating program {program_id}: {e}")
            raise


class PauseProgramView(APIView):
    def post(self, request, program_id):
        logger.info(f"Pausing program {program_id}")
        try:
            result = YelpService.pause_program(program_id)
            logger.info(f"Successfully paused program {program_id}")
            return Response(result, status=status.HTTP_202_ACCEPTED)
        except requests.HTTPError as e:
            logger.error(f"HTTP Error pausing program {program_id}: {e}")
            error_message = f"Failed to pause program: {e}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    error_message = f"Yelp API Error: {error_details}"
                except:
                    error_message = f"Yelp API Error: {e.response.text}"
            return Response(
                {"error": error_message, "status_code": e.response.status_code if hasattr(e, 'response') else 500}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Unexpected error pausing program {program_id}: {e}")
            return Response(
                {"error": f"Unexpected error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResumeProgramView(APIView):
    def post(self, request, program_id):
        logger.info(f"Resuming program {program_id}")
        try:
            result = YelpService.resume_program(program_id)
            logger.info(f"Successfully resumed program {program_id}")
            return Response(result, status=status.HTTP_202_ACCEPTED)
        except requests.HTTPError as e:
            logger.error(f"HTTP Error resuming program {program_id}: {e}")
            error_message = f"Failed to resume program: {e}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    error_message = f"Yelp API Error: {error_details}"
                except:
                    error_message = f"Yelp API Error: {e.response.text}"
            return Response(
                {"error": error_message, "status_code": e.response.status_code if hasattr(e, 'response') else 500}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Unexpected error resuming program {program_id}: {e}")
            return Response(
                {"error": f"Unexpected error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class JobStatusView(APIView):
    def get(self, request, program_id):
        logger.info(f"🔍 JobStatusView: Getting status for program_id '{program_id}' from frontend")
        logger.info(f"📝 JobStatusView: Request URL: {request.build_absolute_uri()}")
        logger.info(f"📝 JobStatusView: Request headers: {dict(request.headers)}")
        logger.info(f"📝 JobStatusView: Request user: {request.user}")
        try:
            data = YelpService.get_program_status(program_id)
            logger.info(f"✅ JobStatusView: Status retrieved for program {program_id}: {data.get('status')}")
            logger.info(f"📊 JobStatusView: Full response data: {data}")
            return Response(data)
        except Exception as e:
            logger.error(f"❌ JobStatusView: Error getting status for program {program_id}: {e}")
            raise


class ActiveJobsView(APIView):
    """Get all programs with PROCESSING/PENDING status or COMPLETED within last 5 minutes"""
    
    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        logger.info("🔍 ActiveJobsView: Getting all active/pending jobs and recently completed")
        try:
            # Calculate 5 minutes ago
            five_minutes_ago = timezone.now() - timedelta(minutes=5)
            
            # Get programs that are:
            # 1. Still processing (PROCESSING or PENDING)
            # 2. Completed within last 5 minutes
            active_programs = Program.objects.filter(
                models.Q(status__in=['PROCESSING', 'PENDING']) |
                models.Q(status='COMPLETED', updated_at__gte=five_minutes_ago)
            ).order_by('-created_at')[:50]  # Limit to 50 most recent
            
            serializer = ProgramSerializer(active_programs, many=True)
            logger.info(f"✅ ActiveJobsView: Found {len(serializer.data)} active/recent jobs")
            
            return Response({
                'jobs': serializer.data,
                'count': len(serializer.data)
            })
        except Exception as e:
            logger.error(f"❌ ActiveJobsView: Error getting active jobs: {e}")
            return Response(
                {"error": f"Failed to get active jobs: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class RequestReportView(APIView):
    def post(self, request, period):
        logger.info(f"Requesting report for period {period} with data: {request.data}")
        try:
            data = YelpService.request_report(period, request.data)
            logger.info(f"Report requested successfully for period {period}")
            return Response(data, status=status.HTTP_202_ACCEPTED)
        except ValueError as ve:
            logger.error(f"Validation error requesting report for period {period}: {ve}")
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.HTTPError as he:
            logger.error(f"HTTP error requesting report for period {period}: {he.response.text}")
            return Response({"detail": he.response.text}, status=he.response.status_code)

class FetchReportView(APIView):
    def get(self, request, period, report_id):
        logger.info(f"Fetching report data for period {period}, report_id {report_id}")
        try:
            data = YelpService.fetch_report_data(period, report_id)
            logger.info(f"Report data fetched successfully for period {period}, report_id {report_id}: {len(data)} records")
            return Response(data)
        except Exception as e:
            logger.error(f"Error fetching report data for period {period}, report_id {report_id}: {e}")
            raise


class ProgramListView(APIView):
    """Return list of programs from Yelp API with pagination support."""

    def get(self, request):
        # Отримуємо параметри пагінації та фільтрації з запиту
        offset = int(request.query_params.get('offset', 0))
        limit = int(request.query_params.get('limit', 20))
        program_status = request.query_params.get('program_status', 'CURRENT')
        
        logger.info(f"Getting programs list from Yelp API - offset: {offset}, limit: {limit}, status: {program_status}")
        try:
            data = YelpService.get_all_programs(offset=offset, limit=limit, program_status=program_status)
            logger.info(f"Retrieved {len(data.get('programs', []))} programs from Yelp API")
            return Response(data)
        except Exception as e:
            logger.error(f"Error getting programs list from Yelp API: {e}")
            status_code = getattr(getattr(e, 'response', None), 'status_code', status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({"detail": str(e)}, status=status_code)


class ProgramInfoView(APIView):
    """Return single program info by job/program id."""

    def get(self, request):
        program_id = request.query_params.get("program_id")
        logger.info(f"Getting program info for program_id: {program_id}")
        
        if not program_id:
            logger.warning("Program info requested without program_id parameter")
            return Response(
                {"detail": "program_id query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            program = get_object_or_404(Program, job_id=program_id)
            serializer = ProgramSerializer(program)
            logger.info(f"Program info retrieved successfully for program_id: {program_id}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting program info for program_id {program_id}: {e}")
            raise


class BusinessProgramsView(APIView):
    """Return programs info for a given business id from Yelp."""

    def get(self, request, business_id):
        logger.info(f"Getting business programs for business_id: {business_id}")
        try:
            data = YelpService.get_business_programs(business_id)
            logger.info(f"Business programs retrieved successfully for business_id: {business_id}")
            return Response(data)
        except Exception as e:
            logger.error(f"Error getting business programs for business_id {business_id}: {e}")
            raise


class PartnerProgramInfoView(APIView):
    """Return program info from Yelp for a specific program id."""

    def get(self, request, program_id):
        logger.info(f"Getting partner program info for program_id: {program_id}")
        try:
            data = YelpService.get_program_info(program_id)
            logger.info(f"Partner program info retrieved successfully for program_id: {program_id}")
            return Response(data)
        except Exception as e:
            logger.error(f"Error getting partner program info for program_id {program_id}: {e}")
            raise

class ProgramFeaturesView(APIView):
    """Get and update program features"""
    
    def get(self, request, program_id):
        """Get available and active features for a specific program"""
        logger.info(f"🌐 ProgramFeaturesView.GET: Incoming request for program_id: {program_id}")
        logger.info(f"🌐 ProgramFeaturesView.GET: Request method: {request.method}")
        logger.info(f"🌐 ProgramFeaturesView.GET: Request headers: {dict(request.headers)}")
        logger.info(f"🌐 ProgramFeaturesView.GET: Request user: {getattr(request, 'user', 'Anonymous')}")
        logger.info(f"🌐 ProgramFeaturesView.GET: Request IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            logger.info(f"🔄 ProgramFeaturesView.GET: Calling YelpService.get_program_features for {program_id}")
            data = YelpService.get_program_features(program_id)
            logger.info(f"✅ ProgramFeaturesView.GET: Successfully retrieved features for program_id: {program_id}")
            logger.info(f"📊 ProgramFeaturesView.GET: Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            if isinstance(data, dict) and 'features' in data:
                logger.info(f"🎯 ProgramFeaturesView.GET: Available features: {list(data['features'].keys())}")
            return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"Program not found: {program_id}")
                return Response(
                    {"detail": "Program not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                logger.warning(f"Bad request for program features: {program_id}")
                return Response(
                    {"detail": "Invalid program ID or program doesn't support features"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            logger.error(f"HTTP error getting program features for {program_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ ProgramFeaturesView.GET: Unexpected error for program_id {program_id}: {e}")
            logger.error(f"❌ ProgramFeaturesView.GET: Exception type: {type(e).__name__}")
            logger.error(f"❌ ProgramFeaturesView.GET: Exception args: {e.args}")
            import traceback
            logger.error(f"❌ ProgramFeaturesView.GET: Full traceback: {traceback.format_exc()}")
            raise
    
    def post(self, request, program_id):
        """Update features for a specific program (Yelp uses POST for updates)"""
        logger.info(f"🌐 ProgramFeaturesView.POST: Incoming update request for program_id: {program_id}")
        logger.info(f"🌐 ProgramFeaturesView.POST: Request method: {request.method}")
        logger.info(f"🌐 ProgramFeaturesView.POST: Request headers: {dict(request.headers)}")
        logger.info(f"🌐 ProgramFeaturesView.POST: Request content type: {request.content_type}")
        logger.info(f"🌐 ProgramFeaturesView.POST: Request user: {getattr(request, 'user', 'Anonymous')}")
        logger.info(f"🌐 ProgramFeaturesView.POST: Request IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        logger.info(f"📝 ProgramFeaturesView.POST: Raw request data: {request.data}")
        
        # Log feature types being updated
        if isinstance(request.data, dict) and 'features' in request.data:
            feature_types = list(request.data['features'].keys()) if isinstance(request.data['features'], dict) else []
            logger.info(f"🎯 ProgramFeaturesView.POST: Feature types being updated: {feature_types}")
        
        # Validate the request payload
        logger.info(f"🔍 ProgramFeaturesView.POST: Validating request payload with ProgramFeaturesRequestSerializer")
        serializer = ProgramFeaturesRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"❌ ProgramFeaturesView.POST: Validation failed for program_id: {program_id}")
            logger.error(f"❌ ProgramFeaturesView.POST: Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"✅ ProgramFeaturesView.POST: Validation passed, proceeding with update")
        
        try:
            logger.info(f"🔄 ProgramFeaturesView.POST: Calling YelpService.update_program_features for {program_id}")
            data = YelpService.update_program_features(program_id, request.data)
            logger.info(f"✅ ProgramFeaturesView.POST: Successfully updated features for program_id: {program_id}")
            logger.info(f"📊 ProgramFeaturesView.POST: Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"Program not found for features update: {program_id}")
                return Response(
                    {"detail": "Program not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                logger.warning(f"Bad request for program features update: {program_id}")
                try:
                    error_data = e.response.json()
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"detail": "Invalid features data"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            logger.error(f"HTTP error updating program features for {program_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ ProgramFeaturesView.POST: Unexpected error for program_id {program_id}: {e}")
            logger.error(f"❌ ProgramFeaturesView.POST: Exception type: {type(e).__name__}")
            logger.error(f"❌ ProgramFeaturesView.POST: Exception args: {e.args}")
            import traceback
            logger.error(f"❌ ProgramFeaturesView.POST: Full traceback: {traceback.format_exc()}")
            raise
    
    
    def delete(self, request, program_id):
        """Delete/disable specific features for a program"""
        logger.info(f"🌐 ProgramFeaturesView.DELETE: Incoming delete request for program_id: {program_id}")
        logger.info(f"🌐 ProgramFeaturesView.DELETE: Request method: {request.method}")
        logger.info(f"🌐 ProgramFeaturesView.DELETE: Request headers: {dict(request.headers)}")
        logger.info(f"🌐 ProgramFeaturesView.DELETE: Request user: {getattr(request, 'user', 'Anonymous')}")
        logger.info(f"🌐 ProgramFeaturesView.DELETE: Request IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        logger.info(f"📝 ProgramFeaturesView.DELETE: Raw request data: {request.data}")
        
        # Validate the request payload
        logger.info(f"🔍 ProgramFeaturesView.DELETE: Validating request payload with ProgramFeaturesDeleteSerializer")
        serializer = ProgramFeaturesDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"❌ ProgramFeaturesView.DELETE: Validation failed for program_id: {program_id}")
            logger.error(f"❌ ProgramFeaturesView.DELETE: Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        features_list = serializer.validated_data['features']
        logger.info(f"🗑️ ProgramFeaturesView.DELETE: Features to delete (validated): {features_list}")
        logger.info(f"✅ ProgramFeaturesView.DELETE: Validation passed, proceeding with deletion")
        
        try:
            logger.info(f"🔄 ProgramFeaturesView.DELETE: Calling YelpService.delete_program_features for {program_id}")
            data = YelpService.delete_program_features(program_id, features_list)
            logger.info(f"✅ ProgramFeaturesView.DELETE: Successfully deleted features for program_id: {program_id}")
            logger.info(f"📊 ProgramFeaturesView.DELETE: Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"Program not found for features deletion: {program_id}")
                return Response(
                    {"detail": "Program not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                logger.warning(f"Bad request for program features deletion: {program_id}")
                try:
                    error_data = e.response.json()
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"detail": "Invalid features data"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            logger.error(f"HTTP error deleting program features for {program_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ ProgramFeaturesView.DELETE: Unexpected error for program_id {program_id}: {e}")
            logger.error(f"❌ ProgramFeaturesView.DELETE: Exception type: {type(e).__name__}")
            logger.error(f"❌ ProgramFeaturesView.DELETE: Exception args: {e.args}")
            import traceback
            logger.error(f"❌ ProgramFeaturesView.DELETE: Full traceback: {traceback.format_exc()}")
            raise


class SyncStatusView(APIView):
    """Статус синхронізації - заглушка для майбутнього функціоналу"""
    
    def get(self, request):
        # Простий статус без використання неіснуючих моделей
        return Response({
            'status': 'available',
            'message': 'Sync functionality not yet implemented',
            'total_programs': 0,
            'latest_sync': None,
            'last_full_sync': None,
            'last_incremental_sync': None,
        })


# ============= Portfolio API Views =============

class PortfolioProjectDetailView(APIView):
    """Portfolio project detail view (GET, PUT, DELETE)"""
    
    def get(self, request, program_id, project_id):
        """Get portfolio project details"""
        logger.info(f"Getting portfolio project {project_id} for program {program_id}")
        try:
            data = YelpService.get_portfolio_project(program_id, project_id)
            logger.info(f"Portfolio project retrieved successfully")
            return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Project not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            logger.error(f"HTTP error getting portfolio project: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting portfolio project: {e}")
            raise
    
    def put(self, request, program_id, project_id):
        """Update portfolio project"""
        logger.info(f"Updating portfolio project {project_id} for program {program_id}")
        
        # Validate the request payload
        serializer = PortfolioProjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = YelpService.update_portfolio_project(
                program_id, project_id, serializer.validated_data
            )
            logger.info(f"Portfolio project updated successfully")
            return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Project not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"detail": "Invalid project data"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            logger.error(f"HTTP error updating portfolio project: {e}")
            raise
        except Exception as e:
            logger.error(f"Error updating portfolio project: {e}")
            raise
    
    def delete(self, request, program_id, project_id):
        """Delete portfolio project"""
        logger.info(f"Deleting portfolio project {project_id} for program {program_id}")
        try:
            YelpService.delete_portfolio_project(program_id, project_id)
            logger.info(f"Portfolio project deleted successfully")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Project not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            logger.error(f"HTTP error deleting portfolio project: {e}")
            raise
        except Exception as e:
            logger.error(f"Error deleting portfolio project: {e}")
            raise


class PortfolioProjectCreateView(APIView):
    """Create new portfolio project"""
    
    def post(self, request, program_id):
        """Create a new portfolio project draft"""
        logger.info(f"Creating new portfolio project for program {program_id}")
        try:
            data = YelpService.create_portfolio_project(program_id)
            logger.info(f"Portfolio project created successfully: {data.get('project_id')}")
            
            # Create response using serializer
            response_serializer = PortfolioProjectCreateResponseSerializer(data=data)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(data, status=status.HTTP_201_CREATED)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Program not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"detail": "Invalid program"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            logger.error(f"HTTP error creating portfolio project: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating portfolio project: {e}")
            raise


class PortfolioPhotoListView(APIView):
    """Portfolio photos list view (GET, POST)"""
    
    def get(self, request, program_id, project_id):
        """Get all photos for a portfolio project"""
        logger.info(f"Getting photos for project {project_id} in program {program_id}")
        try:
            data = YelpService.get_portfolio_photos(program_id, project_id)
            logger.info(f"Portfolio photos retrieved successfully: {len(data)} photos")
            
            # Validate and serialize the response
            serializer = PortfolioPhotoSerializer(data=data, many=True)
            if serializer.is_valid():
                return Response(serializer.data)
            else:
                # Return raw data if serialization fails
                return Response(data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Project not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            logger.error(f"HTTP error getting portfolio photos: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting portfolio photos: {e}")
            raise
    
    def post(self, request, program_id, project_id):
        """Upload a photo to a portfolio project"""
        logger.info(f"Uploading photo to project {project_id} in program {program_id}")
        
        # Validate the request payload
        serializer = PortfolioPhotoUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = YelpService.upload_portfolio_photo(
                program_id, project_id, serializer.validated_data
            )
            logger.info(f"Portfolio photo uploaded successfully: {data.get('photo_id')}")
            
            # Create response using serializer
            response_serializer = PortfolioPhotoUploadResponseSerializer(data=data)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(data, status=status.HTTP_201_CREATED)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Project not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            elif e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"detail": "Invalid photo data"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            logger.error(f"HTTP error uploading portfolio photo: {e}")
            raise
        except Exception as e:
            logger.error(f"Error uploading portfolio photo: {e}")
            raise


class PortfolioPhotoDetailView(APIView):
    """Portfolio photo detail view (DELETE)"""
    
    def delete(self, request, program_id, project_id, photo_id):
        """Delete a photo from a portfolio project"""
        logger.info(f"Deleting photo {photo_id} from project {project_id} in program {program_id}")
        try:
            YelpService.delete_portfolio_photo(program_id, project_id, photo_id)
            logger.info(f"Portfolio photo deleted successfully")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {"detail": "Photo not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            logger.error(f"HTTP error deleting portfolio photo: {e}")
            raise
        except Exception as e:
            logger.error(f"Error deleting portfolio photo: {e}")
            raise


@method_decorator(csrf_exempt, name='dispatch')
class ValidateCredentialsView(APIView):
    """Validate user credentials against Yelp API before saving."""
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"error": "Username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"🔐 ValidateCredentialsView: Validating credentials for username: '{username}'")
        
        try:
            # Test credentials by making a simple API call to Yelp
            auth = (username, password)
            test_url = f'{YelpService.PARTNER_BASE}/programs/v1'
            
            # Make a simple request with pagination to test credentials
            response = requests.get(
                test_url,
                auth=auth,
                params={'limit': 1, 'offset': 0},
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"✅ ValidateCredentialsView: Credentials are valid for user '{username}'")
                return Response({
                    "valid": True,
                    "message": "Credentials are valid",
                    "username": username
                }, status=status.HTTP_200_OK)
            elif response.status_code == 401:
                logger.warning(f"❌ ValidateCredentialsView: Invalid credentials for user '{username}'")
                return Response({
                    "valid": False,
                    "message": "Invalid credentials - authentication failed",
                    "username": username
                }, status=status.HTTP_401_UNAUTHORIZED)
            else:
                logger.error(f"❌ ValidateCredentialsView: Unexpected response from Yelp API: {response.status_code}")
                return Response({
                    "valid": False,
                    "message": f"Unexpected error from Yelp API: {response.status_code}",
                    "username": username
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except requests.exceptions.Timeout:
            logger.error(f"❌ ValidateCredentialsView: Request timeout validating credentials for '{username}'")
            return Response(
                {"error": "Request timeout - Yelp API is not responding"}, 
                status=status.HTTP_408_REQUEST_TIMEOUT
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ ValidateCredentialsView: Network error validating credentials for '{username}': {e}")
            return Response(
                {"error": f"Network error: {str(e)}"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"❌ ValidateCredentialsView: Unexpected error validating credentials for '{username}': {e}")
            return Response(
                {"error": f"Failed to validate credentials: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class SaveCredentialsView(APIView):
    """Save user credentials for Yelp API authentication."""
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"error": "Username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"🔐 SaveCredentialsView: Saving credentials for username: '{username}'")
        
        try:
            # Сохраняем или обновляем credentials в базе данных
            credential, created = PartnerCredential.objects.get_or_create(
                username=username,
                defaults={'password': password}
            )
            
            if not created:
                # Обновляем пароль если пользователь уже существует
                credential.password = password
                credential.save()
                logger.info(f"✅ SaveCredentialsView: Updated credentials for existing user '{username}'")
            else:
                logger.info(f"✅ SaveCredentialsView: Created new credentials for user '{username}'")
            
            return Response({
                "message": "Credentials saved successfully",
                "username": username,
                "created": created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ SaveCredentialsView: Error saving credentials for '{username}': {e}")
            return Response(
                {"error": f"Failed to save credentials: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============= Custom Suggested Keywords Views =============

class CustomSuggestedKeywordsView(APIView):
    """Manage custom suggested keywords for negative keyword targeting"""
    
    def get(self, request, program_id):
        """Get all custom suggested keywords for a program"""
        logger.info(f"Getting custom suggested keywords for program {program_id}")
        try:
            keywords = CustomSuggestedKeyword.objects.filter(program_id=program_id)
            serializer = CustomSuggestedKeywordSerializer(keywords, many=True)
            logger.info(f"Retrieved {len(serializer.data)} custom suggested keywords for program {program_id}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting custom suggested keywords for {program_id}: {e}")
            return Response(
                {"error": f"Failed to get custom suggested keywords: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, program_id):
        """Add custom suggested keywords for a program"""
        logger.info(f"Adding custom suggested keywords for program {program_id}")
        logger.info(f"Request data: {request.data}")
        
        serializer = CustomSuggestedKeywordCreateSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        keywords = serializer.validated_data['keywords']
        created_keywords = []
        skipped_keywords = []
        
        try:
            for keyword in keywords:
                obj, created = CustomSuggestedKeyword.objects.get_or_create(
                    program_id=program_id,
                    keyword=keyword,
                    defaults={'created_by': request.user.username if request.user.is_authenticated else None}
                )
                if created:
                    created_keywords.append(keyword)
                else:
                    skipped_keywords.append(keyword)
            
            logger.info(f"Added {len(created_keywords)} custom suggested keywords for program {program_id}")
            if skipped_keywords:
                logger.info(f"Skipped {len(skipped_keywords)} duplicate keywords: {skipped_keywords}")
            
            return Response({
                "message": f"Successfully added {len(created_keywords)} keywords",
                "created": created_keywords,
                "skipped": skipped_keywords,
                "total": len(created_keywords) + len(skipped_keywords)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error adding custom suggested keywords for {program_id}: {e}")
            return Response(
                {"error": f"Failed to add custom suggested keywords: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, program_id):
        """Delete custom suggested keywords for a program"""
        logger.info(f"Deleting custom suggested keywords for program {program_id}")
        logger.info(f"Request data: {request.data}")
        
        serializer = CustomSuggestedKeywordDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        keywords = serializer.validated_data['keywords']
        
        try:
            deleted_count, _ = CustomSuggestedKeyword.objects.filter(
                program_id=program_id,
                keyword__in=keywords
            ).delete()
            
            logger.info(f"Deleted {deleted_count} custom suggested keywords for program {program_id}")
            return Response({
                "message": f"Successfully deleted {deleted_count} keywords",
                "deleted": deleted_count
            })
            
        except Exception as e:
            logger.error(f"Error deleting custom suggested keywords for {program_id}: {e}")
            return Response(
                {"error": f"Failed to delete custom suggested keywords: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
