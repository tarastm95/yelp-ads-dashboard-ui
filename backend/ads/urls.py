from django.urls import path, re_path
from .views import (
    CreateProgramView,
    EditProgramView,
    TerminateProgramView,
    UpdateProgramCustomNameView,
    PauseProgramView,
    ResumeProgramView,
    SchedulePauseProgramView,
    ScheduledPausesListView,
    ScheduleBudgetUpdateView,
    ScheduledBudgetUpdatesListView,
    JobStatusView,
    BusinessMatchView,
    SyncSpecialtiesView,
    RequestReportView,
    FetchReportView,
    ProgramListView,
    ProgramSyncView,  # NEW
    ProgramSyncStreamView,  # NEW - SSE streaming sync
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
    # Custom Suggested Keywords Views
    CustomSuggestedKeywordsView,
    # Active Jobs View
    ActiveJobsView,
    JobHistoryView,
    # Duplicate Program View
    DuplicateProgramView,
    # Business IDs View
    BusinessIdsView,
    AvailableFiltersView,  # 🧠 NEW - Smart Filters
    # Logs View
    LogsView,
    # Cancel scheduled operations
    CancelScheduledPauseView,
    CancelScheduledBudgetUpdateView,
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
    path('reseller/program/<str:program_id>/duplicate', DuplicateProgramView.as_view()),
    path('reseller/program/<str:program_id>/edit', EditProgramView.as_view()),
    path('reseller/program/<str:program_id>/end', TerminateProgramView.as_view()),
    path('reseller/program/<str:program_id>/custom-name', UpdateProgramCustomNameView.as_view()),
    path('program/<str:program_id>/pause/v1', PauseProgramView.as_view()),
    path('program/<str:program_id>/resume/v1', ResumeProgramView.as_view()),
    path('program/<str:program_id>/schedule-pause/v1', SchedulePauseProgramView.as_view()),
    path('reseller/scheduled-pauses', ScheduledPausesListView.as_view()),
    path('reseller/scheduled-pause/<int:pause_id>/cancel', CancelScheduledPauseView.as_view()),
    path('program/<str:program_id>/schedule-budget-update/v1', ScheduleBudgetUpdateView.as_view()),
    path('reseller/scheduled-budget-updates', ScheduledBudgetUpdatesListView.as_view()),
    path('reseller/scheduled-budget-update/<int:update_id>/cancel', CancelScheduledBudgetUpdateView.as_view()),
    path('program/<str:program_id>/features/v1', ProgramFeaturesView.as_view()),
    path('reseller/status/<str:program_id>', JobStatusView.as_view()),
    path('reseller/active-jobs', ActiveJobsView.as_view()),
    path('reseller/job-history', JobHistoryView.as_view()),
    path('reseller/programs', ProgramListView.as_view()),
    path('reseller/programs/sync', ProgramSyncView.as_view()),  # NEW - синхронізація (старий метод)
    path('reseller/programs/sync-stream', ProgramSyncStreamView.as_view()),  # NEW - синхронізація з SSE прогресом
    path('reseller/business-ids', BusinessIdsView.as_view()),
    path('reseller/available-filters', AvailableFiltersView.as_view()),  # 🧠 NEW - розумні фільтри
    path('reseller/get_program_info', ProgramInfoView.as_view()),
    path('reseller/business_programs/<str:business_id>', BusinessProgramsView.as_view()),
    path('reseller/program_info/<str:program_id>', PartnerProgramInfoView.as_view()),
    path('sync/status', SyncStatusView.as_view()),

    # Portfolio API endpoints
    path('program/<str:program_id>/portfolio/v1', PortfolioProjectCreateView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/v1', PortfolioProjectDetailView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/photos/v1', PortfolioPhotoListView.as_view()),
    path('program/<str:program_id>/portfolio/<str:project_id>/photos/<str:photo_id>/v1', PortfolioPhotoDetailView.as_view()),

    # Custom Suggested Keywords endpoints
    path('program/<str:program_id>/custom-suggested-keywords', CustomSuggestedKeywordsView.as_view()),

    # Logs endpoint (for debugging and monitoring)
    path('logs/', LogsView.as_view()),

    re_path(r'^reporting/businesses/(?P<period>[^/]+)/?$', RequestReportView.as_view()),
    re_path(r'^reporting/businesses/(?P<period>[^/]+)/(?P<report_id>[^/]+)/?$', FetchReportView.as_view()),
]
