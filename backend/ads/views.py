from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from .services import YelpService
from .models import Program
from .serializers import ProgramSerializer
from django.shortcuts import get_object_or_404

class CreateProgramView(APIView):
    def post(self, request):
        data = YelpService.create_program(request.data)
        return Response(data, status=status.HTTP_201_CREATED)

class BusinessMatchView(APIView):
    def get(self, request):
        data = YelpService.business_match(request.query_params)
        return Response(data)

class SyncSpecialtiesView(APIView):
    def post(self, request):
        data = YelpService.sync_specialties(request.data)
        return Response(data)

class EditProgramView(APIView):
    def post(self, request, program_id):
        data = YelpService.edit_program(program_id, request.data)
        return Response(data)

class TerminateProgramView(APIView):
    def post(self, request, program_id):
        data = YelpService.terminate_program(program_id)
        return Response(data)

class JobStatusView(APIView):
    def get(self, request, program_id):
        data = YelpService.get_program_status(program_id)
        return Response(data)



class RequestReportView(APIView):
    def post(self, request, period):
        try:
            data = YelpService.request_report(period, request.data)
        except ValueError as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.HTTPError as he:
            return Response({"detail": he.response.text}, status=he.response.status_code)
        return Response(data, status=status.HTTP_202_ACCEPTED)

class FetchReportView(APIView):
    def get(self, request, period, report_id):
        data = YelpService.fetch_report_data(period, report_id)
        return Response(data)


class ProgramListView(APIView):
    """Return list of stored programs."""

    def get(self, request):
        programs = Program.objects.all()
        serializer = ProgramSerializer(programs, many=True)
        return Response(serializer.data)


class ProgramInfoView(APIView):
    """Return single program info by job/program id."""

    def get(self, request):
        program_id = request.query_params.get("program_id")
        if not program_id:
            return Response(
                {"detail": "program_id query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        program = get_object_or_404(Program, job_id=program_id)
        serializer = ProgramSerializer(program)
        return Response(serializer.data)
