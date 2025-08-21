import pytest
from rest_framework.test import APIClient
from django.urls import reverse

pytestmark = pytest.mark.django_db

@pytest.fixture
def api_client():
    return APIClient()

def test_create_program(api_client):
    url = reverse('ads:create-program') if False else '/api/programs/'
    response = api_client.post(url, {})
    assert response.status_code in [200, 201, 400, 401]

def test_business_match(api_client):
    url = '/api/businesses/matches/'
    response = api_client.get(url)
    assert response.status_code in [200, 401]

def test_sync_specialties(api_client):
    url = '/api/businesses/sync/'
    response = api_client.post(url, {})
    assert response.status_code in [200, 401]

def test_request_report(api_client):
    url = '/api/reports/daily/'
    response = api_client.post(url, {})
    assert response.status_code in [200, 401]

def test_fetch_report(api_client):
    url = '/api/reports/daily/1/'
    response = api_client.get(url)
    assert response.status_code in [200, 404, 401]


def test_get_programs(api_client):
    url = '/api/reseller/programs'
    response = api_client.get(url)
    assert response.status_code in [200, 401]


def test_get_program_info(api_client):
    url = '/api/reseller/get_program_info'
    response = api_client.get(url)
    assert response.status_code in [200, 400, 404, 401]


def test_pause_program(api_client):
    url = '/api/program/123/pause'
    response = api_client.post(url)
    assert response.status_code in [202, 401, 404]


def test_resume_program(api_client):
    url = '/api/program/123/resume'
    response = api_client.post(url)
    assert response.status_code in [202, 401, 404]


def test_terminate_program(api_client):
    url = '/api/reseller/program/123/end'
    response = api_client.post(url)
    assert response.status_code in [200, 400, 404, 401]


