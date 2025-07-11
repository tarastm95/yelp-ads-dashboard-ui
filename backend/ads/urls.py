from django.urls import path
from .views import (
    CreateProgramView,
    EditProgramView,
    TerminateProgramView,
    JobStatusView,
    BusinessMatchView,
    SyncSpecialtiesView,
    RequestReportView,
    FetchReportView,
)

urlpatterns = [
    # Legacy endpoints
    path('programs/', CreateProgramView.as_view()),
    path('businesses/matches/', BusinessMatchView.as_view()),
    path('businesses/sync/', SyncSpecialtiesView.as_view()),
    path('reports/<str:period>/', RequestReportView.as_view()),
    path('reports/<str:period>/<str:report_id>/', FetchReportView.as_view()),

    # Endpoints aligned with Yelp Ads API
    path('reseller/program/create', CreateProgramView.as_view()),
    path('reseller/program/<str:program_id>/edit', EditProgramView.as_view()),
    path('reseller/program/<str:program_id>/end', TerminateProgramView.as_view()),
    path('reseller/status/<str:job_id>', JobStatusView.as_view()),

    path('reporting/businesses/<str:period>/', RequestReportView.as_view()),
    path('reporting/businesses/<str:period>/<str:report_id>/', FetchReportView.as_view()),
]
