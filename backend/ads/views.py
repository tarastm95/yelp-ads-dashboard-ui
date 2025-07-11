from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import YelpService

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
    def get(self, request, job_id):
        data = YelpService.get_job_status(job_id)
        return Response(data)

class RequestReportView(APIView):
    def post(self, request, period):
        data = YelpService.request_report(period, request.data)
        return Response(data)

class FetchReportView(APIView):
    def get(self, request, period, report_id):
        data = YelpService.fetch_report_data(period, report_id)
        return Response(data)
