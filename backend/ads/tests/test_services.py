import pytest
from decimal import Decimal
from ads.services import YelpService
from ads.models import Program


@pytest.mark.django_db
def test_create_program_stores_budget_in_dollars(monkeypatch):
    payload = {
        'program_name': 'CPC',
        'business_id': 'biz-id',
        'start': '2025-01-01',
        'end': '2025-01-31',
        'budget': 200,
        'is_autobid': True,
    }

    class DummyResponse:
        status_code = 200
        text = ''

        def raise_for_status(self):
            pass

        def json(self):
            return {'job_id': 'job123'}

    def fake_post(url, params=None, auth=None):
        assert params['budget'] == 20000
        return DummyResponse()

    class DummyThread:
        def __init__(self, target, args=(), daemon=None):
            self.target = target
            self.args = args
            self.daemon = daemon

        def start(self):
            pass

    monkeypatch.setattr('ads.services.requests.post', fake_post)
    monkeypatch.setattr(YelpService, '_get_partner_auth', classmethod(lambda cls: ('u', 'p')))
    monkeypatch.setattr('ads.services.threading.Thread', DummyThread)

    YelpService.create_program(payload)
    program = Program.objects.get(job_id='job123')
    assert program.budget == Decimal('200')
