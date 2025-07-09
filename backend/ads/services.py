import requests
from django.conf import settings
from .models import Program, Report

class YelpService:
    PARTNER_BASE = 'https://partner-api.yelp.com'
    FUSION_BASE = 'https://api.yelp.com'
    auth_partner = (settings.YELP_API_KEY, settings.YELP_API_SECRET)
    headers_fusion = {'Authorization': f'Bearer {settings.YELP_FUSION_TOKEN}'}

    @classmethod
    def create_program(cls, payload):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/create'
        resp = requests.post(url, json=payload, auth=cls.auth_partner)
        resp.raise_for_status()
        data = resp.json()
        Program.objects.create(
            program_id=data['program_id'],
            name=payload.get('name', ''),
            budget=payload.get('budget', 0),
            start_date=payload.get('start_date'),
            end_date=payload.get('end_date'),
            status=data.get('status', ''),
        )
        return data

    @classmethod
    def business_match(cls, params):
        url = f'{cls.FUSION_BASE}/v3/businesses/matches'
        resp = requests.get(url, headers=cls.headers_fusion, params=params)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def sync_specialties(cls, payload):
        url = f'{cls.PARTNER_BASE}/v1/batch/businesses/sync'
        resp = requests.post(url, json=payload, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def request_report(cls, period, payload):
        url = f'{cls.FUSION_BASE}/v3/reporting/businesses/{period}'
        resp = requests.post(url, json=payload, headers=cls.headers_fusion)
        resp.raise_for_status()
        data = resp.json()
        Report.objects.create(report_id=data['report_id'], period=period, data={})
        return data

    @classmethod
    def fetch_report_data(cls, period, report_id):
        url = f'{cls.FUSION_BASE}/v3/reporting/businesses/{period}/{report_id}'
        resp = requests.get(url, headers=cls.headers_fusion)
        resp.raise_for_status()
        data = resp.json()
        report = Report.objects.get(report_id=report_id)
        report.data = data
        report.save()
        return data
