from django.urls import path, re_path
from .views import (
    CreateProgramView,
    EditProgramView,
    TerminateProgramView,
    PauseProgramView,
    ResumeProgramView,
    JobStatusView,
    BusinessMatchView,
    SyncSpecialtiesView,
    RequestReportView,
    FetchReportView,
    ProgramListView,
    ProgramInfoView,
    BusinessProgramsView,
    PartnerProgramInfoView,
    ProgramFeaturesView,
    SyncStatusView,
    # Portfolio API Views
    PortfolioProjectDetailView,
    PortfolioProjectCreateView,
    PortfolioPhotoListView,
    PortfolioPhotoDetailView,
    # Auth Views
    ValidateCredentialsView,
    SaveCredentialsView,
)

urlpatterns = [
    # Auth endpoints
    path('auth/validate-credentials', ValidateCredentialsView.as_view()),
    path('auth/save-credentials', SaveCredentialsView.as_view()),
    
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
    path('program/<str:program_id>/pause/v1', PauseProgramView.as_view()),
    path('program/<str:program_id>/resume/v1', ResumeProgramView.as_view()),
    path('program/<str:program_id>/features/v1', ProgramFeaturesView.as_view()),
    path('reseller/status/<str:program_id>', JobStatusView.as_view()),
    path('reseller/programs', ProgramListView.as_view()),
    path('reseller/get_program_info', ProgramInfoView.as_view()),
    path('reseller/business_programs/<str:business_id>', BusinessProgramsView.as_view()),
    path('reseller/program_info/<str:program_id>', PartnerProgramInfoView.as_view()),
    path('sync/status', SyncStatusView.as_view()),

    # Portfolio API endpoints
    path('program/<str:program_id>/portfolio/v1', PortfolioProjectCreateView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/v1', PortfolioProjectDetailView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/photos/v1', PortfolioPhotoListView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/photos/<str:photo_id>/v1', PortfolioPhotoDetailView.as_view()),

    re_path(r'^reporting/businesses/(?P<period>[^/]+)/?$', RequestReportView.as_view()),
    re_path(r'^reporting/businesses/(?P<period>[^/]+)/(?P<report_id>[^/]+)/?$', FetchReportView.as_view()),
]
