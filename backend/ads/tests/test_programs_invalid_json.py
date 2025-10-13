import pytest
import json
import requests
from rest_framework.test import APIClient
from ads.services import YelpService

pytestmark = pytest.mark.django_db


def test_invalid_json_from_yelp(monkeypatch):
    class DummyResponse:
        status_code = 200
        headers = {}
        text = 'invalid'

        def raise_for_status(self):
            pass

        def json(self):
            raise json.JSONDecodeError("Expecting value", "", 0)

    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: DummyResponse())
    monkeypatch.setattr(YelpService, "_get_partner_auth", classmethod(lambda cls: ("user", "pass")))

    client = APIClient()
    response = client.get("/api/reseller/programs")
    assert response.status_code == 500
    assert response.json()["detail"] == "Invalid JSON from Yelp API"
