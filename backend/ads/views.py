from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
import logging
from .services import YelpService
from .models import Program
from .serializers import ProgramSerializer
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
            YelpService.pause_program(program_id)
            return Response(status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logger.error(f"Error pausing program {program_id}: {e}")
            raise


class ResumeProgramView(APIView):
    def post(self, request, program_id):
        logger.info(f"Resuming program {program_id}")
        try:
            YelpService.resume_program(program_id)
            return Response(status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logger.error(f"Error resuming program {program_id}: {e}")
            raise

class JobStatusView(APIView):
    def get(self, request, program_id):
        logger.info(f"Getting status for program {program_id}")
        try:
            data = YelpService.get_program_status(program_id)
            logger.info(f"Status retrieved for program {program_id}: {data.get('status')}")
            return Response(data)
        except Exception as e:
            logger.error(f"Error getting status for program {program_id}: {e}")
            raise



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
    """Return list of stored programs."""

    def get(self, request):
        logger.info("Getting list of all programs")
        try:
            programs = Program.objects.all()
            serializer = ProgramSerializer(programs, many=True)
            logger.info(f"Retrieved {len(programs)} programs")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting programs list: {e}")
            raise


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
