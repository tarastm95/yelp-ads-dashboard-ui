import requests
import csv
import threading
import time
from io import StringIO
from django.conf import settings
from .models import Program, Report, PartnerCredential

class YelpService:
    PARTNER_BASE = 'https://partner-api.yelp.com'
    FUSION_BASE = 'https://api.yelp.com'
    headers_fusion = {'Authorization': f'Bearer {settings.YELP_FUSION_TOKEN}'}

    @classmethod
    def _get_partner_auth(cls):
        """Return credentials stored via Basic auth or fall back to settings."""
        cred = PartnerCredential.objects.order_by('-updated_at').first()
        if cred:
            return cred.username, cred.password
        return settings.YELP_API_KEY, settings.YELP_API_SECRET

    @classmethod
    def create_program(cls, payload):
        """Create a program using the fields coming from the frontend."""
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/create'
        # Partner Advertising API expects query params, not JSON body
        resp = requests.post(url, params=payload, auth=cls._get_partner_auth())
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
        threading.Thread(target=cls._poll_program_status, args=(data['job_id'],), daemon=True).start()
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
        resp = requests.post(url, json=payload, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def edit_program(cls, program_id, payload):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/edit'
        # Partner Advertising API expects query params, not JSON body
        resp = requests.post(url, params=payload, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def terminate_program(cls, program_id):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/end'
        resp = requests.post(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def get_program_status(cls, program_id):
        url = f'{cls.PARTNER_BASE}/v1/reseller/status/{program_id}'
        resp = requests.get(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def _poll_program_status(cls, job_id):
        """Poll program status every 15 seconds until completion."""
        while True:
            data = cls.get_program_status(job_id)
            status = data.get('status')
            program = Program.objects.filter(job_id=job_id).first()
            if program:
                program.status = status
                if status != 'PROCESSING':
                    program.status_data = data
                    # try extract partner program id
                    try:
                        br = data.get('business_results', [])[0]
                        added = br.get('update_results', {}).get('program_added', {})
                        pid = added.get('program_id', {}).get('requested_value')
                        if pid:
                            program.partner_program_id = pid
                    except Exception:
                        pass
                    program.save()
                    break
                program.save()
            if status == 'PROCESSING':
                time.sleep(15)
            else:
                break

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
        """Return programs information for a business."""
        url = f'{cls.PARTNER_BASE}/v1/programs/info/{business_id}'
        resp = requests.get(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def get_program_info(cls, program_id):
        """Return detailed information for a specific program."""
        url = f'{cls.PARTNER_BASE}/v1/programs/info/{program_id}'
        resp = requests.get(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

