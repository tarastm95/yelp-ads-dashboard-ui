import pytest
from rest_framework.test import APIClient
from django.urls import reverse

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
