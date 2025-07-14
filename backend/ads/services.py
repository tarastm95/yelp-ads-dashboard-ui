import requests
import csv
from io import StringIO
from django.conf import settings
from .models import Program, Report

class YelpService:
    PARTNER_BASE = 'https://partner-api.yelp.com'
    FUSION_BASE = 'https://api.yelp.com'
    auth_partner = (settings.YELP_API_KEY, settings.YELP_API_SECRET)
    headers_fusion = {'Authorization': f'Bearer {settings.YELP_FUSION_TOKEN}'}

    @classmethod
    def create_program(cls, payload):
        """Create a program using the fields coming from the frontend."""
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/create'
        # Partner Advertising API expects query params, not JSON body
        resp = requests.post(url, params=payload, auth=cls.auth_partner)
        resp.raise_for_status()
        data = resp.json()
        Program.objects.create(
            job_id=data['job_id'],
            # The frontend sends product_type which we store as name
            name=payload.get('product_type', payload.get('program_name', '')),
            budget=payload.get('budget_amount', payload.get('budget', 0)),
            start_date=payload.get('start'),
            end_date=payload.get('end'),
            status='PENDING',
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
        # Batch sync uses JSON payload
        resp = requests.post(url, json=payload, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def edit_program(cls, program_id, payload):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/edit'
        # Partner Advertising API expects query params, not JSON body
        resp = requests.post(url, params=payload, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def terminate_program(cls, program_id):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/end'
        resp = requests.post(url, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def get_program_status(cls, program_id):
        url = f'{cls.PARTNER_BASE}/v1/reseller/status/{program_id}'
        resp = requests.get(url, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def request_report(cls, period, payload):
        """Request a business level performance report from Yelp."""
        url = f'{cls.FUSION_BASE}/v3/reporting/businesses/{period}'

        # Explicitly build the body from allowed fields.  Frontend may send
        # camelCase names so we support both variants.
        body = {
            # Yelp Reporting API expects "start" and "end" fields.  Support
            # historical parameter names (start_date/end_date) from the frontend
            # for backwards compatibility.
            "start":        payload.get("start")
                             or payload.get("start_date")
                             or payload.get("startDate"),
            "end":          payload.get("end")
                             or payload.get("end_date")
                             or payload.get("endDate"),
            "ids": [
                b.strip()
                for b in (payload.get("business_ids") or [payload.get("business_id")])
                if b
            ],
            "metrics":      payload.get("metrics"),
        }

        # Validate required fields before making the request so that we fail
        # fast and provide a clear error message.
        missing = [k for k, v in body.items() if not v]
        if missing:
            raise ValueError(f"Missing fields for reporting API: {missing}")

        resp = requests.post(url, json=body, headers=cls.headers_fusion)

        try:
            resp.raise_for_status()
        except requests.HTTPError:
            # Include Yelp response text in logs for easier debugging.
            import logging

            logging.getLogger("yelp").error(
                "Yelp Reporting API error %s: %s", resp.status_code, resp.text
            )
            raise

        data = resp.json()
        # Store job id for later polling of the report data.
        Report.objects.create(
            job_id=data.get('report_id', data.get('job_id')),
            period=period,
            data={},  # initial empty
        )
        return data

    @classmethod
    def fetch_report_data(cls, period, report_id):
        url = f'{cls.FUSION_BASE}/v3/reporting/businesses/{period}/{report_id}'
        resp = requests.get(url, headers=cls.headers_fusion)
        resp.raise_for_status()
        # Reporting API returns CSV, not JSON
        csv_text = resp.text
        reader = csv.DictReader(StringIO(csv_text))
        rows = list(reader)

        report = Report.objects.get(job_id=report_id)
        report.data = rows
        report.save()
        return rows

    @classmethod
    def get_business_programs(cls, business_id):
        """Return advertising program info for a given business.

        This uses Yelp's ``/v1/programs/list/<business_id>`` endpoint which
        requires the encrypted Yelp business identifier.
        """
        url = f"{cls.PARTNER_BASE}/v1/programs/list/{business_id}"
        resp = requests.get(url, auth=cls.auth_partner)
        resp.raise_for_status()
        return resp.json()
