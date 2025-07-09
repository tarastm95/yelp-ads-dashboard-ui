from django.urls import path
from .views import (
    CreateProgramView,
    BusinessMatchView,
    SyncSpecialtiesView,
    RequestReportView,
    FetchReportView,
)

urlpatterns = [
    path('programs/', CreateProgramView.as_view()),
    path('businesses/matches/', BusinessMatchView.as_view()),
    path('businesses/sync/', SyncSpecialtiesView.as_view()),
    path('reports/<str:period>/', RequestReportView.as_view()),
    path('reports/<str:period>/<str:report_id>/', FetchReportView.as_view()),
]
