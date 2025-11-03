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
from .models import Program, PortfolioProject, PortfolioPhoto, PartnerCredential, CustomSuggestedKeyword, ScheduledPause, ScheduledBudgetUpdate, ProgramRegistry
from .serializers import (
    ProgramSerializer, ProgramFeaturesRequestSerializer, ProgramFeaturesDeleteSerializer,
    PortfolioProjectSerializer, PortfolioProjectCreateResponseSerializer,
    PortfolioPhotoUploadSerializer, PortfolioPhotoUploadResponseSerializer,
    PortfolioPhotoSerializer, CustomSuggestedKeywordSerializer,
    CustomSuggestedKeywordCreateSerializer, CustomSuggestedKeywordDeleteSerializer,
    DuplicateProgramRequestSerializer, DuplicateProgramResponseSerializer
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


class UpdateProgramCustomNameView(APIView):
    """Update custom name for a program (local DB only)"""
    
    def post(self, request, program_id):
        """Update custom name for a program"""
        from .models import ProgramRegistry
        
        # Get username
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        custom_name = request.data.get('custom_name', '').strip()
        
        logger.info(f"📝 Updating custom name for program {program_id} to: '{custom_name}'")
        
        try:
            # Find program in registry
            program = ProgramRegistry.objects.get(
                username=username,
                program_id=program_id
            )
            
            # Update custom name
            program.custom_name = custom_name if custom_name else None
            program.save()
            
            logger.info(f"✅ Updated custom name for program {program_id}")
            
            return Response({
                'program_id': program_id,
                'custom_name': program.custom_name,
                'message': 'Custom name updated successfully'
            })
            
        except ProgramRegistry.DoesNotExist:
            logger.error(f"❌ Program {program_id} not found in registry for user {username}")
            return Response(
                {"error": "Program not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"❌ Error updating custom name for program {program_id}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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


class SchedulePauseProgramView(APIView):
    """Schedule program pause in the future"""
    
    def post(self, request, program_id):
        logger.info(f"Scheduling pause for program {program_id}")
        
        try:
            scheduled_datetime_str = request.data.get('scheduled_datetime')
            if not scheduled_datetime_str:
                return Response(
                    {"error": "scheduled_datetime is required (format: YYYY-MM-DDTHH:MM:SS)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from datetime import datetime
            from django.utils import timezone
            try:
                # Parse the datetime - ensure it's timezone-aware
                if scheduled_datetime_str.endswith('Z'):
                    scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str.replace('Z', '+00:00'))
                elif '+' in scheduled_datetime_str or scheduled_datetime_str.count('-') > 2:
                    # Already has timezone info
                    scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str)
                else:
                    # No timezone info, assume UTC
                    scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str.replace('Z', ''))
                    # Make it timezone-aware (UTC)
                    scheduled_datetime = timezone.make_aware(scheduled_datetime)
            except ValueError as e:
                return Response(
                    {"error": f"Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS. Error: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Ensure scheduled_datetime is timezone-aware
            if timezone.is_naive(scheduled_datetime):
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
            
            # Check if scheduled time is in the future (use timezone-aware now)
            now = timezone.now()
            if scheduled_datetime <= now:
                return Response(
                    {"error": "Scheduled datetime must be in the future"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get program info to validate start_date and end_date
            try:
                program = ProgramRegistry.objects.get(program_id=program_id)
            except ProgramRegistry.DoesNotExist:
                return Response(
                    {"error": f"Program {program_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate that scheduled datetime is within program dates
            scheduled_date = scheduled_datetime.date()
            
            if program.start_date and scheduled_date < program.start_date:
                return Response(
                    {"error": f"Scheduled pause date ({scheduled_date}) is before program start date ({program.start_date})"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if program.end_date and scheduled_date > program.end_date:
                return Response(
                    {"error": f"Scheduled pause date ({scheduled_date}) is after program end date ({program.end_date})"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get username from request
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            username = request.user.username
            
            # Check if there's already a pending pause for this program
            existing_pending = ScheduledPause.objects.filter(
                program_id=program_id,
                status='PENDING'
            ).first()
            
            if existing_pending:
                return Response(
                    {"error": f"There is already a pending pause scheduled for {existing_pending.scheduled_datetime}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create scheduled pause
            scheduled_pause = ScheduledPause.objects.create(
                program_id=program_id,
                username=username,
                scheduled_datetime=scheduled_datetime,
                status='PENDING'
            )
            
            logger.info(f"Successfully scheduled pause for program {program_id} at {scheduled_datetime}")
            
            return Response({
                "id": scheduled_pause.id,
                "program_id": program_id,
                "scheduled_datetime": scheduled_pause.scheduled_datetime.isoformat(),
                "status": scheduled_pause.status,
                "message": f"Program {program_id} will be paused at {scheduled_datetime}"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error scheduling pause for program {program_id}: {e}")
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduledPausesListView(APIView):
    """Get list of all scheduled pauses"""
    
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        
        # Get all scheduled pauses for this user
        scheduled_pauses = ScheduledPause.objects.filter(username=username).order_by('-scheduled_datetime')
        
        # Prepare response data
        pauses_data = []
        for pause in scheduled_pauses:
            # Try to get program info
            program_info = None
            try:
                program = ProgramRegistry.objects.get(program_id=pause.program_id, username=username)
                program_info = {
                    'program_name': program.custom_name or program.program_name or pause.program_id,
                    'business_id': program.yelp_business_id,
                    'business_name': program.business.name if program.business else program.business_name,
                    'program_status': program.program_status,
                    'program_pause_status': program.program_pause_status,
                    'start_date': program.start_date.isoformat() if program.start_date else None,
                    'end_date': program.end_date.isoformat() if program.end_date else None,
                }
            except ProgramRegistry.DoesNotExist:
                program_info = {
                    'program_name': pause.program_id,
                    'business_id': None,
                    'business_name': None,
                    'program_status': None,
                    'program_pause_status': None,
                    'start_date': None,
                    'end_date': None,
                }
            
            pauses_data.append({
                'id': pause.id,
                'program_id': pause.program_id,
                'program_info': program_info,
                'scheduled_datetime': pause.scheduled_datetime.isoformat(),
                'status': pause.status,
                'executed_at': pause.executed_at.isoformat() if pause.executed_at else None,
                'error_message': pause.error_message,
                'created_at': pause.created_at.isoformat(),
            })
        
        return Response({
            'count': len(pauses_data),
            'results': pauses_data
        }, status=status.HTTP_200_OK)


class CancelScheduledPauseView(APIView):
    """Cancel a scheduled pause"""
    
    def post(self, request, pause_id):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        
        try:
            scheduled_pause = ScheduledPause.objects.get(id=pause_id, username=username)
            
            # Only allow cancelling PENDING pauses
            if scheduled_pause.status != 'PENDING':
                return Response(
                    {"error": f"Cannot cancel a pause with status {scheduled_pause.status}. Only PENDING pauses can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update status to CANCELLED
            scheduled_pause.status = 'CANCELLED'
            scheduled_pause.save()
            
            logger.info(f"Successfully cancelled scheduled pause {pause_id} for program {scheduled_pause.program_id}")
            
            return Response({
                "message": f"Scheduled pause for program {scheduled_pause.program_id} has been cancelled",
                "status": "CANCELLED"
            }, status=status.HTTP_200_OK)
            
        except ScheduledPause.DoesNotExist:
            return Response(
                {"error": "Scheduled pause not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error cancelling scheduled pause {pause_id}: {e}")
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduleBudgetUpdateView(APIView):
    """Schedule a program parameters update for the future"""
    
    def post(self, request, program_id):
        logger.info(f"Scheduling program update for program {program_id}")
        
        try:
            new_budget = request.data.get('new_budget')
            scheduled_datetime_str = request.data.get('scheduled_datetime')
            is_autobid = request.data.get('is_autobid')
            max_bid = request.data.get('max_bid')
            pacing_method = request.data.get('pacing_method')
            
            # At least one parameter should be provided
            if not new_budget and is_autobid is None and not max_bid and not pacing_method:
                return Response(
                    {"error": "At least one parameter (budget, bidding, or pacing) must be provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from datetime import datetime
            from django.utils import timezone
            
            # Parse the datetime - ensure it's timezone-aware
            if scheduled_datetime_str.endswith('Z'):
                scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str.replace('Z', '+00:00'))
            elif '+' in scheduled_datetime_str or scheduled_datetime_str.count('-') > 2:
                scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str)
            else:
                scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str.replace('Z', ''))
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
            
            # Ensure timezone-aware
            if timezone.is_naive(scheduled_datetime):
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
            
            # Check if scheduled time is in the future
            now = timezone.now()
            if scheduled_datetime <= now:
                return Response(
                    {"error": "Scheduled datetime must be in the future"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate and convert budget if provided
            budget_cents = None
            if new_budget:
                try:
                    budget_cents = int(float(new_budget) * 100)  # Convert dollars to cents
                    if budget_cents < 2500:  # Minimum $25.00
                        return Response(
                            {"error": "Budget must be at least $25.00"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except (ValueError, TypeError):
                    return Response(
                        {"error": "Invalid budget format"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate and convert max_bid if provided
            max_bid_cents = None
            if max_bid:
                try:
                    max_bid_cents = int(float(max_bid) * 100)  # Convert dollars to cents
                    if max_bid_cents < 25:  # Minimum $0.25
                        return Response(
                            {"error": "Max bid must be at least $0.25"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except (ValueError, TypeError):
                    return Response(
                        {"error": "Invalid max bid format"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get username from request
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            username = request.user.username
            
            # Check if there's already a pending update for this program
            existing_pending = ScheduledBudgetUpdate.objects.filter(
                program_id=program_id,
                status='PENDING'
            ).first()
            
            if existing_pending:
                return Response(
                    {"error": f"There is already a pending budget update scheduled for {existing_pending.scheduled_datetime}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create scheduled budget update
            scheduled_update = ScheduledBudgetUpdate.objects.create(
                program_id=program_id,
                username=username,
                new_budget=budget_cents,
                is_autobid=is_autobid,
                max_bid=max_bid_cents,
                pacing_method=pacing_method,
                scheduled_datetime=scheduled_datetime,
                status='PENDING'
            )
            
            logger.info(f"Successfully scheduled program update for program {program_id} at {scheduled_datetime}")
            
            update_parts = []
            if budget_cents:
                update_parts.append(f"budget to ${budget_cents/100}")
            if is_autobid is not None:
                update_parts.append(f"bidding to {'automatic' if is_autobid else 'manual'}")
            if pacing_method:
                update_parts.append(f"pacing to {pacing_method}")
            
            message = f"Program {program_id} will be updated: {', '.join(update_parts)} at {scheduled_datetime}"
            
            return Response({
                "id": scheduled_update.id,
                "program_id": program_id,
                "scheduled_datetime": scheduled_update.scheduled_datetime.isoformat(),
                "status": scheduled_update.status,
                "message": message
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error scheduling budget update for program {program_id}: {e}")
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduledBudgetUpdatesListView(APIView):
    """Get list of all scheduled budget updates"""
    
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        
        # Get all scheduled budget updates for this user
        scheduled_updates = ScheduledBudgetUpdate.objects.filter(username=username).order_by('-scheduled_datetime')
        
        # Prepare response data
        updates_data = []
        for update in scheduled_updates:
            # Try to get program info
            program_info = None
            try:
                program = ProgramRegistry.objects.get(program_id=update.program_id, username=username)
                program_info = {
                    'program_name': program.custom_name or program.program_name or update.program_id,
                    'business_id': program.yelp_business_id,
                    'business_name': program.business.name if program.business else program.business_name,
                    'program_status': program.program_status,
                    'current_budget': float(program.budget) if program.budget else None,
                }
            except ProgramRegistry.DoesNotExist:
                program_info = {
                    'program_name': update.program_id,
                    'business_id': None,
                    'business_name': None,
                    'program_status': None,
                    'current_budget': None,
                }
            
            updates_data.append({
                'id': update.id,
                'program_id': update.program_id,
                'program_info': program_info,
                'new_budget': float(update.new_budget) / 100 if update.new_budget else None,  # Convert cents to dollars
                'is_autobid': update.is_autobid,
                'max_bid': float(update.max_bid) / 100 if update.max_bid else None,
                'pacing_method': update.pacing_method,
                'scheduled_datetime': update.scheduled_datetime.isoformat(),
                'status': update.status,
                'executed_at': update.executed_at.isoformat() if update.executed_at else None,
                'error_message': update.error_message,
                'created_at': update.created_at.isoformat(),
            })
        
        return Response({
            'count': len(updates_data),
            'results': updates_data
        }, status=status.HTTP_200_OK)


class CancelScheduledBudgetUpdateView(APIView):
    """Cancel a scheduled budget update"""
    
    def post(self, request, update_id):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        
        try:
            scheduled_update = ScheduledBudgetUpdate.objects.get(id=update_id, username=username)
            
            # Only allow cancelling PENDING updates
            if scheduled_update.status != 'PENDING':
                return Response(
                    {"error": f"Cannot cancel an update with status {scheduled_update.status}. Only PENDING updates can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update status to CANCELLED
            scheduled_update.status = 'CANCELLED'
            scheduled_update.save()
            
            logger.info(f"Successfully cancelled scheduled budget update {update_id} for program {scheduled_update.program_id}")
            
            return Response({
                "message": f"Scheduled budget update for program {scheduled_update.program_id} has been cancelled",
                "status": "CANCELLED"
            }, status=status.HTTP_200_OK)
            
        except ScheduledBudgetUpdate.DoesNotExist:
            return Response(
                {"error": "Scheduled budget update not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error cancelling scheduled budget update {update_id}: {e}")
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


class DuplicateProgramView(APIView):
    """Duplicate an existing program with new dates and budget (create a 'layer')"""
    
    def post(self, request, program_id):
        logger.info(f"🔄 DuplicateProgramView: Duplicating program {program_id}")
        logger.info(f"📝 Request data: {request.data}")
        
        # Validate request
        serializer = DuplicateProgramRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"❌ Validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Call service method to duplicate program
            result = YelpService.duplicate_program(program_id, serializer.validated_data)
            logger.info(f"✅ Program duplicated successfully: {result}")
            
            # Return structured response
            response_serializer = DuplicateProgramResponseSerializer(data=result)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)
            else:
                return Response(result, status=status.HTTP_202_ACCEPTED)
                
        except ValueError as e:
            logger.error(f"❌ Validation error duplicating program: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"❌ Error duplicating program {program_id}: {e}")
            return Response(
                {"error": f"Failed to duplicate program: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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


class JobHistoryView(APIView):
    """Get job history with filtering by status and time range"""
    
    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        # Get query parameters
        days = int(request.query_params.get('days', 7))  # Default: last 7 days
        job_status = request.query_params.get('status', 'ALL')  # COMPLETED, REJECTED, FAILED, ALL
        limit = int(request.query_params.get('limit', 100))  # Max 100
        
        logger.info(f"🔍 JobHistoryView: Getting job history - days={days}, status={job_status}, limit={limit}")
        
        try:
            # Calculate time range
            time_ago = timezone.now() - timedelta(days=days)
            
            # Build query
            query = models.Q(created_at__gte=time_ago)
            
            if job_status != 'ALL':
                query &= models.Q(status=job_status)
            
            # Get jobs
            jobs = Program.objects.filter(query).order_by('-created_at')[:limit]
            
            serializer = ProgramSerializer(jobs, many=True)
            logger.info(f"✅ JobHistoryView: Found {len(serializer.data)} jobs")
            
            return Response({
                'jobs': serializer.data,
                'count': len(serializer.data),
                'filters': {
                    'days': days,
                    'status': job_status,
                    'limit': limit
                }
            })
        except Exception as e:
            logger.error(f"❌ JobHistoryView: Error getting job history: {e}")
            return Response(
                {"error": f"Failed to get job history: {str(e)}"}, 
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


class ProgramSyncView(APIView):
    """
    Синхронізує програми при відкритті сторінки /programs.
    Повертає статус синхронізації.
    """
    
    def post(self, request):
        """Запускає синхронізацію програм для поточного користувача."""
        from .sync_service import ProgramSyncService
        
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        logger.info(f"🔄 Sync requested by {username}")
        
        try:
            # Запускаємо синхронізацію
            result = ProgramSyncService.sync_programs(username, batch_size=40)
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"❌ Sync failed for {username}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProgramSyncStreamView(APIView):
    """
    Синхронізація програм з прогресом в реальному часі через Server-Sent Events (SSE).
    
    🚀 ASYNC VERSION - Використовує AsyncIO для максимальної швидкості!
    - Автоматично визначає кількість сторінок
    - Виконує ВСІ запити паралельно
    - Швидкість: ~2-5 секунд для 1913 програм
    """
    
    def post(self, request):
        """Запускає ASYNC синхронізацію з SSE streaming."""
        from django.http import StreamingHttpResponse
        from .async_sync_service import AsyncProgramSyncService
        import json
        
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        username = request.user.username
        
        # Параметри для async синхронізації
        batch_size = int(request.data.get('batch_size', 40)) if hasattr(request, 'data') else 40
        
        logger.info(f"🚀 [ASYNC-SSE] Async sync stream requested by {username} (batch_size={batch_size})")
        
        def event_stream():
            """
            Generator для SSE подій з ASYNC синхронізацією.
            
            Yields:
                SSE formatted events: data: {json}\n\n
            """
            try:
                # Запускаємо ASYNC синхронізацію з стрімінгом
                # Автоматично визначає кількість сторінок та робить ВСІ запити паралельно
                event_count = 0
                for progress_event in AsyncProgramSyncService.sync_with_asyncio(
                    username, 
                    batch_size=batch_size
                ):
                    # Форматуємо подію для SSE
                    event_data = json.dumps(progress_event, ensure_ascii=False)
                    event_count += 1
                    logger.debug(f"📤 [SSE] Sending event #{event_count}: {progress_event.get('type')}")
                    yield f"data: {event_data}\n\n"
                    
                logger.info(f"✅ [ASYNC-SSE] Async sync stream completed for {username} ({event_count} events sent)")
                
            except Exception as e:
                logger.error(f"❌ [ASYNC-SSE] Stream error for {username}: {e}", exc_info=True)
                error_event = json.dumps({
                    'type': 'error',
                    'message': f'Async sync failed: {str(e)}'
                })
                yield f"data: {error_event}\n\n"
        
        # Створюємо streaming response з правильними headers для SSE
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
        
        return response


class ProgramListView(APIView):
    """
    Повертає список програм з Yelp API з використанням БД для фільтрації по business_id.
    
    Логіка:
    - Без фільтру: звичайний запит до API
    - З business_id: використовує БД для отримання program_ids, потім витягує дані з API
    """
    
    @staticmethod
    def enrich_programs_with_custom_names(programs, username):
        """
        Збагачує програми custom_name з локальної бази даних та деталями бізнесу з Yelp Fusion API.
        
        Args:
            programs: List of program dicts from Yelp API
            username: Username for filtering
            
        Returns:
            List of enriched programs with custom_name, business_name, and business_url fields
        """
        from .models import ProgramRegistry
        from .services import YelpService
        
        if not programs or not username:
            return programs
        
        # Отримуємо program_ids
        program_ids = [p.get('program_id') for p in programs if p.get('program_id')]
        
        if not program_ids:
            return programs
        
        # Отримуємо custom_name та business_name з БД одним запитом
        registry_data = ProgramRegistry.objects.filter(
            username=username,
            program_id__in=program_ids
        ).values('program_id', 'custom_name', 'yelp_business_id', 'business_name')
        
        # Створюємо словник program_id -> custom_name
        custom_names = {item['program_id']: item['custom_name'] for item in registry_data}
        
        # Створюємо словник business_id -> business_name з БД
        business_names_from_db = {}
        for item in registry_data:
            if item['yelp_business_id'] and item['business_name']:
                business_names_from_db[item['yelp_business_id']] = item['business_name']
        
        # Збираємо унікальні business_ids
        business_ids = set()
        for program in programs:
            business_id = program.get('yelp_business_id')
            if not business_id and program.get('businesses'):
                business_id = program['businesses'][0].get('yelp_business_id')
            if business_id:
                business_ids.add(business_id)
        
        # Отримуємо деталі бізнесів (спочатку з БД, потім з API тільки якщо немає в БД)
        business_details = {}
        business_ids_without_names = business_ids - set(business_names_from_db.keys())
        
        # Для бізнесів без назв в БД - запитуємо API (обмежено для запобігання rate limit)
        for business_id in list(business_ids_without_names)[:10]:
            try:
                details = YelpService.get_business_details(business_id)
                if details:
                    business_details[business_id] = {
                        'name': details.get('name'),
                        'url': details.get('url'),
                        'alias': details.get('alias')
                    }
                    # Зберігаємо в БД для наступних використань
                    if details.get('name'):
                        ProgramRegistry.objects.filter(
                            username=username,
                            yelp_business_id=business_id
                        ).update(business_name=details['name'])
            except Exception as e:
                logger.warning(f"⚠️ Failed to get business details for {business_id}: {e}")
                continue
        
        # Додаємо назви з БД до business_details
        for business_id, name in business_names_from_db.items():
            if business_id not in business_details:
                business_details[business_id] = {
                    'name': name,
                    'url': None,  # URL не зберігається в БД
                    'alias': None
                }
        
        # Додаємо custom_name та business details до кожної програми
        for program in programs:
            program_id = program.get('program_id')
            
            # Додаємо custom_name
            if program_id and program_id in custom_names:
                program['custom_name'] = custom_names[program_id]
            
            # Додаємо business details
            business_id = program.get('yelp_business_id')
            if not business_id and program.get('businesses'):
                business_id = program['businesses'][0].get('yelp_business_id')
            
            if business_id and business_id in business_details:
                program['business_name'] = business_details[business_id]['name']
                program['business_url'] = business_details[business_id]['url']
                program['business_alias'] = business_details[business_id]['alias']
        
        return programs

    def get(self, request):
        from .sync_service import ProgramSyncService
        from .models import ProgramRegistry
        from django.core.cache import cache
        import hashlib
        
        # Параметри
        offset = int(request.query_params.get('offset', 0))
        limit = int(request.query_params.get('limit', 20))
        load_all = request.query_params.get('all', 'false').lower() == 'true'  # ⚡ НОВИЙ: завантажити все одразу
        program_status = request.query_params.get('program_status', 'CURRENT')
        business_id = request.query_params.get('business_id', None)
        program_type = request.query_params.get('program_type', None)
        
        # Автентифікація
        username = None
        if request.user and request.user.is_authenticated:
            username = request.user.username
        
        logger.info(f"Getting programs - offset: {offset}, limit: {limit}, status: {program_status}, business_id: {business_id}, program_type: {program_type}, user: {username}")
        
        # Create cache key
        cache_key = f"programs:{username}:{program_status}:{business_id or 'all'}:{program_type or 'all'}:{offset}:{limit}:{load_all}"
        cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()
        
        # Check cache (60 second TTL)
        cached_data = cache.get(cache_key_hash)
        if cached_data:
            logger.info(f"✅ [CACHE HIT] Returning cached data for key: {cache_key[:50]}...")
            cached_data['from_cache'] = True
            return Response(cached_data)
        
        logger.info(f"❌ [CACHE MISS] Fetching from database for key: {cache_key[:50]}...")
        
        # Yelp API не підтримує фільтр program_status=ACTIVE/INACTIVE
        # Тому завжди запитуємо ALL і фільтруємо локально
        api_status = 'ALL' if program_status in ['ACTIVE', 'INACTIVE'] else program_status
        logger.info(f"🔄 Mapping frontend status '{program_status}' -> API status '{api_status}'")
        
        try:
            # Фільтрація по business_id через API
            if business_id and business_id != 'all' and username:
                logger.info(f"🔍 Filtering by business_id: {business_id}, status: {program_status}, program_type: {program_type} from API")
                
                # Отримуємо program_ids для цього бізнесу з БД з фільтром по статусу та типу програми
                program_ids = ProgramSyncService.get_program_ids_for_business(
                    username, 
                    business_id, 
                    status=program_status,
                    program_type=program_type
                )
                
                if not program_ids:
                    logger.warning(f"⚠️  No programs found for business {business_id}")
                    response_data = {
                        'programs': [],
                        'total_count': 0,
                        'offset': offset,
                        'limit': limit,
                        'business_id': business_id,
                        'from_db': True
                    }
                    # Cache the result for 60 seconds
                    cache.set(cache_key_hash, response_data, 60)
                    return Response(response_data)
                
                total_count = len(program_ids)
                logger.info(f"📊 Found {total_count} program_ids for business {business_id}")
                
                # Пагінація program_ids
                paginated_ids = program_ids[offset:offset + limit]
                
                # 🚀 ОПТИМІЗАЦІЯ: Отримуємо ВСІ програми ОДНИМ запитом використовуючи .values()
                logger.info(f"⚡ Fetching {len(paginated_ids)} programs from DB using values()...")
                
                # Get data as dictionaries (NO ORM object creation)
                programs_data = list(ProgramRegistry.objects.filter(
                    username=username,
                    program_id__in=paginated_ids
                ).select_related('business').values(
                    'program_id', 'program_name', 'program_status', 'program_pause_status',
                    'yelp_business_id', 'start_date', 'end_date', 'custom_name',
                    'status', 'budget', 'currency', 'is_autobid', 'max_bid',
                    'billed_impressions', 'billed_clicks', 'ad_cost', 'fee_period',
                    'businesses', 'active_features', 'available_features',
                    'business__name'  # From related business
                ))
                
                # Create map for preserving order
                programs_map = {p['program_id']: p for p in programs_data}
                
                # Convert to frontend format (preserving order)
                programs = []
                for program_id in paginated_ids:
                    program_registry = programs_map.get(program_id)
                    if not program_registry:
                        continue
                    
                    try:
                        # Convert directly from dictionary (faster than ORM objects)
                        program_data = {
                            'program_id': program_registry['program_id'],
                            'program_type': program_registry['program_name'],
                            'program_status': program_registry['program_status'] or program_registry['status'],
                            'program_pause_status': program_registry['program_pause_status'],
                            'yelp_business_id': program_registry['yelp_business_id'],
                            'business_id': program_registry['yelp_business_id'],
                            'business_name': program_registry['business__name'] or program_registry['yelp_business_id'],
                            'start_date': program_registry['start_date'].isoformat() if program_registry['start_date'] else None,
                            'end_date': program_registry['end_date'].isoformat() if program_registry['end_date'] else None,
                            'custom_name': program_registry['custom_name'],
                            'businesses': program_registry['businesses'] or [],
                            'active_features': program_registry['active_features'] or [],
                            'available_features': program_registry['available_features'] or [],
                        }
                        
                        # Add program_metrics if available
                        if program_registry['budget'] is not None:
                            program_data['program_metrics'] = {
                                'budget': int(float(program_registry['budget']) * 100),
                                'currency': program_registry['currency'] or 'USD',
                                'is_autobid': program_registry['is_autobid'],
                                'max_bid': int(float(program_registry['max_bid']) * 100) if program_registry['max_bid'] else None,
                                'billed_impressions': program_registry['billed_impressions'] or 0,
                                'billed_clicks': program_registry['billed_clicks'] or 0,
                                'ad_cost': int(float(program_registry['ad_cost']) * 100) if program_registry['ad_cost'] else 0,
                                'fee_period': program_registry['fee_period'],
                            }
                        
                        programs.append(program_data)
                    except Exception as e:
                        logger.warning(f"⚠️  Failed to process program {program_id}: {e}")
                        continue
                
                logger.info(f"✅ Returning {len(programs)} programs from database for business {business_id}")
                
                response_data = {
                    'programs': programs,
                    'total_count': len(programs),
                    'offset': offset,
                    'limit': limit,
                    'business_id': business_id,
                    'from_db': True
                }
                
                # Cache the result for 60 seconds
                cache.set(cache_key_hash, response_data, 60)
                
                return Response(response_data)
            else:
                # Фільтрація по program_type без business_id
                if program_type and program_type != 'ALL' and username:
                    logger.info(f"🔍 Filtering by program_type: {program_type} from DB")
                    
                    # Отримуємо всі program_ids з фільтром по статусу та типу
                    query = ProgramRegistry.objects.filter(username=username)
                    
                    if program_status and program_status != 'ALL':
                        # Використовуємо ту ж логіку маппінгу статусів що і для availableFilters
                        if program_status == 'CURRENT':
                            query = query.filter(program_status='ACTIVE')
                        elif program_status == 'ACTIVE':
                            query = query.filter(program_status='ACTIVE')
                        elif program_status == 'INACTIVE':
                            query = query.filter(program_status='INACTIVE')
                        elif program_status == 'TERMINATED':
                            query = query.filter(program_status='TERMINATED')
                        elif program_status == 'EXPIRED':
                            query = query.filter(program_status='EXPIRED')
                        elif program_status == 'PAST':
                            query = query.filter(
                                program_status='INACTIVE',
                                program_pause_status='NOT_PAUSED'
                            )
                        elif program_status == 'FUTURE':
                            from django.utils import timezone
                            today = timezone.now().date()
                            query = query.filter(start_date__gt=today)
                        elif program_status == 'PAUSED':
                            query = query.filter(program_pause_status='PAUSED')
                    
                    query = query.filter(program_name=program_type)
                    
                    program_ids = list(query.values_list('program_id', flat=True))
                    
                    if not program_ids:
                        logger.warning(f"⚠️  No programs found for program_type {program_type}")
                        response_data = {
                            'programs': [],
                            'total_count': 0,
                            'offset': offset,
                            'limit': limit,
                            'program_type': program_type,
                            'from_db': True
                        }
                        # Cache the result for 60 seconds
                        cache.set(cache_key_hash, response_data, 60)
                        return Response(response_data)
                    
                    total_count = len(program_ids)
                    logger.info(f"📊 Found {total_count} program_ids for program_type {program_type}")
                    
                    # Пагінація program_ids
                    paginated_ids = program_ids[offset:offset + limit]
                    
                    # 🚀 ОПТИМІЗАЦІЯ: Отримуємо ВСІ програми ОДНИМ запитом використовуючи .values()
                    logger.info(f"⚡ Fetching {len(paginated_ids)} programs from DB using values()...")
                    
                    # Get data as dictionaries (NO ORM object creation)
                    programs_data = list(ProgramRegistry.objects.filter(
                        username=username,
                        program_id__in=paginated_ids
                    ).select_related('business').values(
                        'program_id', 'program_name', 'program_status', 'program_pause_status',
                        'yelp_business_id', 'start_date', 'end_date', 'custom_name',
                        'status', 'budget', 'currency', 'is_autobid', 'max_bid',
                        'billed_impressions', 'billed_clicks', 'ad_cost', 'fee_period',
                        'businesses', 'active_features', 'available_features',
                        'business__name'  # From related business
                    ))
                    
                    # Create map for preserving order
                    programs_map = {p['program_id']: p for p in programs_data}
                    
                    # Convert to frontend format (preserving order)
                    programs = []
                    for program_id in paginated_ids:
                        program_registry = programs_map.get(program_id)
                        if not program_registry:
                            continue
                            
                        try:
                            # Convert directly from dictionary (faster than ORM objects)
                            program_data = {
                                'program_id': program_registry['program_id'],
                                'program_type': program_registry['program_name'],
                                'program_status': program_registry['program_status'] or program_registry['status'],
                                'program_pause_status': program_registry['program_pause_status'],
                                'yelp_business_id': program_registry['yelp_business_id'],
                                'business_id': program_registry['yelp_business_id'],
                                'business_name': program_registry['business__name'] or program_registry['yelp_business_id'],
                                'start_date': program_registry['start_date'].isoformat() if program_registry['start_date'] else None,
                                'end_date': program_registry['end_date'].isoformat() if program_registry['end_date'] else None,
                                'custom_name': program_registry['custom_name'],
                                'businesses': program_registry['businesses'] or [],
                                'active_features': program_registry['active_features'] or [],
                                'available_features': program_registry['available_features'] or [],
                            }
                            
                            # Add program_metrics if available
                            if program_registry['budget'] is not None:
                                program_data['program_metrics'] = {
                                    'budget': int(float(program_registry['budget']) * 100),
                                    'currency': program_registry['currency'] or 'USD',
                                    'is_autobid': program_registry['is_autobid'],
                                    'max_bid': int(float(program_registry['max_bid']) * 100) if program_registry['max_bid'] else None,
                                    'billed_impressions': program_registry['billed_impressions'] or 0,
                                    'billed_clicks': program_registry['billed_clicks'] or 0,
                                    'ad_cost': int(float(program_registry['ad_cost']) * 100) if program_registry['ad_cost'] else 0,
                                    'fee_period': program_registry['fee_period'],
                                }
                            
                            programs.append(program_data)
                        except Exception as e:
                            logger.warning(f"⚠️  Failed to process program {program_id}: {e}")
                            continue
                    
                    logger.info(f"✅ Returning {len(programs)} programs from ProgramRegistry for program_type {program_type}")
                    
                    response_data = {
                        'programs': programs,
                        'total_count': len(programs),  # Return actual count of valid programs
                        'offset': offset,
                        'limit': limit,
                        'program_type': program_type,
                        'from_db': True
                    }
                    
                    # Cache the result for 60 seconds
                    cache.set(cache_key_hash, response_data, 60)
                    
                    return Response(response_data)
                else:
                    # Без фільтру - отримуємо всі програми з БД
                    logger.info(f"🔍 Getting all programs from DB with status: {program_status}")
                    
                    query = ProgramRegistry.objects.filter(username=username)
                    
                    if program_status and program_status != 'ALL':
                        # Використовуємо правильну логіку маппінгу статусів
                        if program_status == 'CURRENT':
                            query = query.filter(program_status='ACTIVE')
                        elif program_status == 'ACTIVE':
                            query = query.filter(program_status='ACTIVE')
                        elif program_status == 'INACTIVE':
                            query = query.filter(program_status='INACTIVE')
                        elif program_status == 'TERMINATED':
                            query = query.filter(program_status='TERMINATED')
                        elif program_status == 'EXPIRED':
                            query = query.filter(program_status='EXPIRED')
                        elif program_status == 'PAST':
                            query = query.filter(
                                program_status='INACTIVE',
                                program_pause_status='NOT_PAUSED'
                            )
                        elif program_status == 'FUTURE':
                            from django.utils import timezone
                            today = timezone.now().date()
                            query = query.filter(start_date__gt=today)
                        elif program_status == 'PAUSED':
                            query = query.filter(program_pause_status='PAUSED')
                    
                    # Загальна кількість після фільтрів
                    total_count = query.count()
                    
                    # ⚡ ШВИДКИЙ РЕЖИМ: Якщо load_all=true, завантажуємо ВСЕ одразу без пагінації
                    if load_all:
                        logger.info(f"⚡ FAST MODE: Loading ALL {total_count} programs in ONE request...")
                        program_ids = list(query.values_list('program_id', flat=True))
                        # Оновлюємо offset та limit для response
                        actual_offset = 0
                        actual_limit = total_count
                    else:
                        # Отримуємо program_ids з пагінацією
                        program_ids = list(query.values_list('program_id', flat=True)[offset:offset + limit])
                        actual_offset = offset
                        actual_limit = limit
                    
                    if not program_ids:
                        logger.info(f"⚠️  No programs found")
                        response_data = {
                            'programs': [],
                            'total_count': 0,
                            'offset': offset,
                            'limit': limit,
                            'from_db': True
                        }
                        # Cache the result for 60 seconds
                        cache.set(cache_key_hash, response_data, 60)
                        return Response(response_data)
                    
                    logger.info(f"📊 Found {len(program_ids)} program_ids (total: {total_count})")
                    
                    # 🚀 ОПТИМІЗАЦІЯ: Отримуємо ВСІ програми ОДНИМ запитом використовуючи .values()
                    logger.info(f"⚡ Fetching {len(program_ids)} programs from DB using values()...")
                    
                    # Get data as dictionaries (NO ORM object creation)
                    programs_data = list(ProgramRegistry.objects.filter(
                        username=username,
                        program_id__in=program_ids
                    ).select_related('business').values(
                        'program_id', 'program_name', 'program_status', 'program_pause_status',
                        'yelp_business_id', 'start_date', 'end_date', 'custom_name',
                        'status', 'budget', 'currency', 'is_autobid', 'max_bid',
                        'billed_impressions', 'billed_clicks', 'ad_cost', 'fee_period',
                        'businesses', 'active_features', 'available_features',
                        'business__name'  # From related business
                    ))
                    
                    # Create map for preserving order
                    programs_map = {p['program_id']: p for p in programs_data}
                    
                    # Convert to frontend format (preserving order)
                    programs = []
                    for program_id in program_ids:
                        program_registry = programs_map.get(program_id)
                        if not program_registry:
                            continue
                            
                        try:
                            # Convert directly from dictionary (faster than ORM objects)
                            program_data = {
                                'program_id': program_registry['program_id'],
                                'program_type': program_registry['program_name'],
                                'program_status': program_registry['program_status'] or program_registry['status'],
                                'program_pause_status': program_registry['program_pause_status'],
                                'yelp_business_id': program_registry['yelp_business_id'],
                                'business_id': program_registry['yelp_business_id'],
                                'business_name': program_registry['business__name'] or program_registry['yelp_business_id'],
                                'start_date': program_registry['start_date'].isoformat() if program_registry['start_date'] else None,
                                'end_date': program_registry['end_date'].isoformat() if program_registry['end_date'] else None,
                                'custom_name': program_registry['custom_name'],
                                'businesses': program_registry['businesses'] or [],
                                'active_features': program_registry['active_features'] or [],
                                'available_features': program_registry['available_features'] or [],
                            }
                            
                            # Add program_metrics if available
                            if program_registry['budget'] is not None:
                                program_data['program_metrics'] = {
                                    'budget': int(float(program_registry['budget']) * 100),
                                    'currency': program_registry['currency'] or 'USD',
                                    'is_autobid': program_registry['is_autobid'],
                                    'max_bid': int(float(program_registry['max_bid']) * 100) if program_registry['max_bid'] else None,
                                    'billed_impressions': program_registry['billed_impressions'] or 0,
                                    'billed_clicks': program_registry['billed_clicks'] or 0,
                                    'ad_cost': int(float(program_registry['ad_cost']) * 100) if program_registry['ad_cost'] else 0,
                                    'fee_period': program_registry['fee_period'],
                                }
                            
                            programs.append(program_data)
                        except Exception as e:
                            logger.warning(f"⚠️  Failed to process program {program_id}: {e}")
                            continue
                    
                    logger.info(f"✅ Returning {len(programs)} programs from database")
                    
                    response_data = {
                        'programs': programs,
                        'total_count': total_count,
                        'offset': actual_offset,
                        'limit': actual_limit,
                        'from_db': True,
                        'loaded_all': load_all  # Індикатор що завантажено все
                    }
                    
                    # Cache the result for 60 seconds
                    cache.set(cache_key_hash, response_data, 60)
                    
                    return Response(response_data)
                
        except Exception as e:
            logger.error(f"Error getting programs list: {e}")
            status_code = getattr(getattr(e, 'response', None), 'status_code', status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({"detail": str(e)}, status=status_code)


class ProgramInfoView(APIView):
    """Return single program info by job/program id from local database."""

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
            # Try to find by job_id first, then by partner_program_id
            program = None
            try:
                program = Program.objects.get(job_id=program_id)
                logger.info(f"Found program by job_id: {program_id}")
            except Program.DoesNotExist:
                try:
                    program = Program.objects.get(partner_program_id=program_id)
                    logger.info(f"Found program by partner_program_id: {program_id}")
                except Program.DoesNotExist:
                    logger.warning(f"Program not found in database: {program_id}")
                    return Response(
                        {"detail": "Program not found in local database"},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            
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
                    # Extract detailed error from Yelp response
                    if 'error' in error_data:
                        yelp_error = error_data['error']
                        detailed_error = {
                            "error": yelp_error.get('description', yelp_error.get('id', 'Unknown error')),
                            "error_id": yelp_error.get('id'),
                            "full_response": error_data
                        }
                        return Response(detailed_error, status=status.HTTP_400_BAD_REQUEST)
                    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response(
                        {"error": "Invalid features data"}, 
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


class BusinessIdsView(APIView):
    """
    Повертає список унікальних business_id з локальної БД.
    Підтримує фільтрацію по статусу програм та типу програми.
    Business names беруться з БД (завантажуються під час синхронізації).
    """
    
    def get(self, request):
        """Отримує business IDs з БД для поточного користувача з фільтром по статусу та типу програми."""
        from .sync_service import ProgramSyncService
        
        try:
            # Get username from authenticated user
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            username = request.user.username
            
            # Отримуємо фільтри з query params
            program_status = request.query_params.get('program_status', None)
            program_type = request.query_params.get('program_type', None)
            
            logger.info(f"🔍 BusinessIdsView: Fetching business IDs for {username} with status filter: {program_status or 'ALL'}, program_type filter: {program_type or 'ALL'}")
            
            # Отримуємо business IDs з БД з фільтром по статусу та типу програми
            businesses = ProgramSyncService.get_business_ids_for_user(
                username, 
                status=program_status,
                program_type=program_type
            )
            
            logger.info(f"📊 Got {len(businesses)} business IDs with names from DB")
            
            # Businesses вже містять business_name з БД - не треба додаткових API запитів
            enriched_businesses = []
            for biz in businesses:
                enriched_businesses.append({
                    'business_id': biz['business_id'],
                    'business_name': biz.get('business_name', biz['business_id']),  # Фоллбек на ID
                    'program_count': biz.get('program_count', 0),
                    'active_count': biz.get('active_count', 0),
                })
            
            logger.info(f"✅ Returning {len(enriched_businesses)} business IDs (filtered by status: {program_status or 'ALL'}, program_type: {program_type or 'ALL'})")
            
            return Response({
                'total': len(enriched_businesses),
                'businesses': enriched_businesses,
                'from_db': True,
                'filtered_by_status': program_status
            })
            
        except Exception as e:
            logger.error(f"❌ Error in BusinessIdsView: {e}", exc_info=True)
            return Response(
                {"error": f"Failed to fetch business IDs: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AvailableFiltersView(APIView):
    """
    🧠 РОЗУМНІ ФІЛЬТРИ: Повертає доступні опції для фільтрів на основі поточного вибору.
    
    Приклад:
    - GET /reseller/filters?program_status=CURRENT → {statuses: [...], program_types: ['BP', 'CPC'], businesses: [...]}
    - GET /reseller/filters?program_status=CURRENT&program_type=CPC → {statuses: [...], program_types: [...], businesses: [...]}
    """
    
    def get(self, request):
        """
        Отримує доступні опції для фільтрів на основі поточного вибору.
        
        Query parameters:
        - program_status: фільтр по статусу (опціонально)
        - program_type: фільтр по типу програми (опціонально)
        - business_id: фільтр по бізнесу (опціонально)
        """
        from .models import ProgramRegistry
        from django.db.models import Count, Q
        
        try:
            # Authentication
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            username = request.user.username
            
            # Отримуємо фільтри з query params
            program_status = request.query_params.get('program_status', None)
            program_type = request.query_params.get('program_type', None)
            business_id = request.query_params.get('business_id', None)
            
            logger.info(f"🧠 [SMART FILTER] Request for {username}: status={program_status}, type={program_type}, business={business_id}")
            
            # Базовий queryset
            from django.utils import timezone
            today = timezone.now().date()
            query = ProgramRegistry.objects.filter(username=username).select_related('business')
            
            # ⚠️ ВАЖЛИВО: Логіка статусів відрізняється від прямого маппінгу:
            # - CURRENT: program_status == "ACTIVE"
            # - PAST: program_status == "INACTIVE" + program_pause_status == "NOT_PAUSED"
            # - FUTURE: start_date > today (незалежно від program_status)
            # - PAUSED: program_pause_status == "PAUSED" (незалежно від program_status)
            
            if program_status and program_status != 'ALL':
                if program_status == 'CURRENT':
                    # Активні програми (program_status=ACTIVE)
                    query = query.filter(program_status='ACTIVE')
                elif program_status == 'ACTIVE':
                    # Пряма фільтрація по ACTIVE (якщо користувач вибрав ACTIVE напряму)
                    query = query.filter(program_status='ACTIVE')
                elif program_status == 'INACTIVE':
                    # Пряма фільтрація по INACTIVE
                    query = query.filter(program_status='INACTIVE')
                elif program_status == 'TERMINATED':
                    # Програми зі статусом TERMINATED
                    query = query.filter(program_status='TERMINATED')
                elif program_status == 'EXPIRED':
                    # Програми зі статусом EXPIRED
                    query = query.filter(program_status='EXPIRED')
                elif program_status == 'PAST':
                    # Минулі програми (INACTIVE + NOT_PAUSED)
                    query = query.filter(
                        program_status='INACTIVE',
                        program_pause_status='NOT_PAUSED'
                    )
                elif program_status == 'FUTURE':
                    # Майбутні програми (дата старту > сьогодні)
                    query = query.filter(start_date__gt=today)
                elif program_status == 'PAUSED':
                    # Призупинені програми (program_pause_status=PAUSED)
                    query = query.filter(program_pause_status='PAUSED')
            
            if program_type and program_type != 'ALL':
                # ⚠️ ВАЖЛИВО: В БД поле називається 'program_name', а не 'program_type'!
                # program_name зберігає тип програми (CPC, BP, EP, тощо)
                query = query.filter(program_name=program_type)
            
            if business_id and business_id != 'all':
                query = query.filter(yelp_business_id=business_id)
            
            # 1. Доступні статуси - розраховуємо на основі реальних даних
            from django.db.models import Q, Exists, OuterRef
            base_query = ProgramRegistry.objects.filter(username=username)
            
            available_statuses = ['ALL']  # ALL завжди доступний
            
            # CURRENT: є програми з program_status=ACTIVE
            if base_query.filter(program_status='ACTIVE').exists():
                available_statuses.append('CURRENT')
            
            # PAST: є програми з INACTIVE + NOT_PAUSED
            if base_query.filter(
                program_status='INACTIVE',
                program_pause_status='NOT_PAUSED'
            ).exists():
                available_statuses.append('PAST')
            
            # FUTURE: є програми з start_date > today
            if base_query.filter(start_date__gt=today).exists():
                available_statuses.append('FUTURE')
            
            # PAUSED: є програми з program_pause_status=PAUSED
            if base_query.filter(program_pause_status='PAUSED').exists():
                available_statuses.append('PAUSED')
            
            # 2. Доступні program types (на основі вибраного статусу та бізнесу)
            # ⚠️ ВАЖЛИВО: В БД поле називається 'program_name', а не 'program_type'!
            available_program_types = list(
                query
                .exclude(program_name__isnull=True)
                .exclude(program_name='')
                .values_list('program_name', flat=True)
                .distinct()
                .order_by('program_name')
            )
            available_program_types.insert(0, 'ALL')
            
            # 3. Доступні businesses (на основі вибраного статусу та program type)
            available_businesses_qs = (
                query
                .exclude(yelp_business_id__isnull=True)
                .exclude(yelp_business_id='')
                .values('yelp_business_id')
                .annotate(
                    program_count=Count('program_id'),
                    business_name=models.Max('business__name')  # Беремо з Business FK
                )
                .order_by('-program_count')
            )
            
            available_businesses = [
                {
                    'business_id': b['yelp_business_id'],
                    'business_name': b['business_name'] or b['yelp_business_id'],
                    'program_count': b['program_count']
                }
                for b in available_businesses_qs
            ]
            
            # Підрахунок загальної кількості програм для поточних фільтрів
            total_programs = query.count()
            
            logger.info(f"🧠 [SMART FILTER] Response: {len(available_statuses)} statuses, "
                       f"{len(available_program_types)} types, {len(available_businesses)} businesses, "
                       f"{total_programs} programs")
            
            return Response({
                'statuses': available_statuses,
                'program_types': available_program_types,
                'businesses': available_businesses,
                'total_programs': total_programs,
                'applied_filters': {
                    'program_status': program_status or 'ALL',
                    'program_type': program_type or 'ALL',
                    'business_id': business_id or 'all'
                }
            })
            
        except Exception as e:
            logger.error(f"❌ Error in AvailableFiltersView: {e}", exc_info=True)
            return Response(
                {"error": f"Failed to fetch available filters: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogsView(APIView):
    """
    API endpoint for viewing application logs.
    Useful for debugging and monitoring.
    """
    
    def get(self, request):
        """
        Get application logs with filtering.
        
        Query parameters:
        - level: Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        - hours: Number of hours to look back (default: 1)
        - limit: Maximum number of logs to return (default: 100, max: 1000)
        - search: Search in message or path
        """
        from django.db.models import Q
        from django.utils import timezone
        from datetime import timedelta
        from .models import LogEntry
        
        try:
            # Get query parameters
            level = request.query_params.get('level', None)
            hours = int(request.query_params.get('hours', 1))
            limit = min(int(request.query_params.get('limit', 100)), 1000)  # Max 1000
            search = request.query_params.get('search', None)
            
            # Base query - logs from last N hours
            since = timezone.now() - timedelta(hours=hours)
            logs = LogEntry.objects.filter(timestamp__gte=since)
            
            # Apply filters
            if level:
                logs = logs.filter(level=level.upper())
            
            if search:
                logs = logs.filter(
                    Q(message__icontains=search) | 
                    Q(path__icontains=search)
                )
            
            # Order and limit
            logs = logs.order_by('-timestamp')[:limit]
            
            # Serialize
            data = [{
                'timestamp': log.timestamp.isoformat(),
                'level': log.level,
                'logger': log.logger_name,
                'message': log.message,
                'method': log.method,
                'path': log.path,
                'status': log.status_code,
                'duration': log.duration,
                'user': log.user,
            } for log in logs]
            
            return Response({
                'count': len(data),
                'filters': {
                    'level': level,
                    'hours': hours,
                    'search': search,
                    'limit': limit,
                },
                'logs': data
            })
            
        except Exception as e:
            logger.error(f"Error retrieving logs: {e}")
            return Response(
                {"error": f"Failed to retrieve logs: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
