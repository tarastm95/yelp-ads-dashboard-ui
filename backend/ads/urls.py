from django.urls import path, re_path
from .views import (
    CreateProgramView,
    EditProgramView,
    TerminateProgramView,
    JobStatusView,
    BusinessProgramsView,
    BusinessMatchView,
    SyncSpecialtiesView,
    RequestReportView,
    FetchReportView,
    ProgramListView,
    ProgramInfoView,
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
    path('reseller/status/<str:program_id>', JobStatusView.as_view()),
    path('reseller/business_programs/<str:business_id>', BusinessProgramsView.as_view()),
    path('reseller/programs', ProgramListView.as_view()),
    path('reseller/get_program_info', ProgramInfoView.as_view()),

    re_path(r'^reporting/businesses/(?P<period>[^/]+)/?$', RequestReportView.as_view()),
    re_path(r'^reporting/businesses/(?P<period>[^/]+)/(?P<report_id>[^/]+)/?$', FetchReportView.as_view()),
]
