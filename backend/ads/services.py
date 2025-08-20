import requests
import csv
import threading
import time
import logging
from io import StringIO
from django.conf import settings
from .models import Program, Report, PartnerCredential

logger = logging.getLogger(__name__)

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
        logger.info(f"Creating program with payload: {payload}")
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/create'
        
        # Правильно формуємо параметри залежно від типу програми
        program_type = payload.get('program_name', '').upper()
        params = {
            'business_id': payload.get('business_id'),
            'program_name': program_type,
            'start': payload.get('start'),
            'end': payload.get('end'),
            'promotion_code': payload.get('promotion_code'),
        }
        
        # Для CPC програм додаємо budget та bid параметри
        if program_type == 'CPC':
            budget = payload.get('budget')
            if budget is None:
                raise ValueError("CPC program requires budget")
            if isinstance(budget, (int, float)) and budget < 1000:
                budget = int(budget * 100)  # $200.00 → 20000
            params['budget'] = int(budget)

            is_autobid = payload.get('is_autobid')
            if is_autobid is None:
                raise ValueError("CPC program requires is_autobid flag")
            params['is_autobid'] = str(is_autobid).lower()

            if not is_autobid:
                max_bid = payload.get('max_bid')
                if max_bid is None:
                    raise ValueError("max_bid required when is_autobid is false")
                if isinstance(max_bid, (int, float)) and max_bid < 100:
                    max_bid = int(max_bid * 100)  # $5.00 → 500
                params['max_bid'] = int(max_bid)

            if payload.get('currency'):
                params['currency'] = payload['currency']
            if payload.get('pacing_method'):
                params['pacing_method'] = payload['pacing_method']
            if payload.get('fee_period'):
                params['fee_period'] = payload['fee_period']
            if payload.get('ad_categories'):
                params['ad_categories'] = ','.join(payload['ad_categories'])

        logger.info(f"Final API parameters: {params}")
        
        try:
            logger.debug(f"Making request to: {url}")
            # Partner Advertising API expects query params, not JSON body
            params_filtered = {k: v for k, v in params.items() if v is not None}
            resp = requests.post(url, params=params_filtered, auth=cls._get_partner_auth())
            logger.debug(f"Response status: {resp.status_code}")
            logger.debug(f"Response text: {resp.text}")
            resp.raise_for_status()
            
            data = resp.json()
            logger.info(f"Program creation response: {data}")
            
            program = Program.objects.create(
                job_id=data['job_id'],
                name=program_type,
                budget=params.get('budget', 0),
                start_date=params.get('start'),
                end_date=params.get('end'),
                status='PENDING',
            )
            logger.info(f"Program saved to database: {program.job_id}")
            
            threading.Thread(target=cls._poll_program_status, args=(data['job_id'],), daemon=True).start()
            logger.info(f"Started background polling for program: {data['job_id']}")
            
            return data
        except Exception as e:
            logger.error(f"Error creating program: {e}")
            raise

    @classmethod
    def business_match(cls, params):
        logger.info(f"Business match request with params: {params}")
        url = f'{cls.FUSION_BASE}/v3/businesses/matches'
        try:
            resp = requests.get(url, headers=cls.headers_fusion, params=params)
            logger.debug(f"Business match response status: {resp.status_code}")
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"Business match found {len(data.get('businesses', []))} businesses")
            return data
        except Exception as e:
            logger.error(f"Error in business match: {e}")
            raise

    @classmethod
    def sync_specialties(cls, payload):
        url = f'{cls.PARTNER_BASE}/v1/batch/businesses/sync'
        # Batch sync uses JSON payload
        resp = requests.post(url, json=payload, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def edit_program(cls, program_id, payload):
        """Edit existing program."""
        logger.info(f"Editing program {program_id} with payload: {payload}")
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/edit'

        params = {}

        if 'budget' in payload:
            budget = payload['budget']
            if isinstance(budget, (int, float)) and budget < 1000:
                budget = int(budget * 100)
            params['budget'] = int(budget)

        if 'max_bid' in payload:
            max_bid = payload['max_bid']
            if isinstance(max_bid, (int, float)) and max_bid < 100:
                max_bid = int(max_bid * 100)
            params['max_bid'] = int(max_bid)

        if 'future_budget_date' in payload:
            params['future_budget_date'] = payload['future_budget_date']
        if 'pacing_method' in payload:
            params['pacing_method'] = payload['pacing_method']
        if 'ad_categories' in payload and payload['ad_categories']:
            params['ad_categories'] = ','.join(payload['ad_categories'])
        if 'start' in payload:
            params['start'] = payload['start']
        if 'end' in payload:
            params['end'] = payload['end']

        logger.info(f"Edit program API parameters: {params}")

        try:
            params_filtered = {k: v for k, v in params.items() if v is not None}
            resp = requests.post(url, params=params_filtered, auth=cls._get_partner_auth())
            logger.debug(f"Edit response status: {resp.status_code}")
            logger.debug(f"Edit response text: {resp.text}")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Error editing program {program_id}: {e}")
            raise

    @classmethod
    def terminate_program(cls, program_id):
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/end'
        resp = requests.post(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def pause_program(cls, program_id):
        url = f'{cls.PARTNER_BASE}/program/{program_id}/pause/v1'
        resp = requests.post(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return {'status': resp.status_code}

    @classmethod
    def resume_program(cls, program_id):
        url = f'{cls.PARTNER_BASE}/program/{program_id}/resume/v1'
        resp = requests.post(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return {'status': resp.status_code}

    @classmethod
    def get_program_status(cls, program_id):
        logger.debug(f"Getting program status for: {program_id}")
        url = f'{cls.PARTNER_BASE}/v1/reseller/status/{program_id}'
        try:
            resp = requests.get(url, auth=cls._get_partner_auth())
            resp.raise_for_status()
            data = resp.json()
            logger.debug(f"Program {program_id} status: {data.get('status')}")
            return data
        except Exception as e:
            logger.error(f"Error getting program status for {program_id}: {e}")
            raise

    @classmethod
    def _poll_program_status(cls, job_id):
        """Poll program status every 15 seconds until completion."""
        logger.info(f"Starting status polling for job: {job_id}")
        while True:
            try:
                logger.debug(f"Polling status for job: {job_id}")
                data = cls.get_program_status(job_id)
                status = data.get('status')
                logger.debug(f"Job {job_id} status: {status}")
                
                program = Program.objects.filter(job_id=job_id).first()
                if program:
                    program.status = status
                    if status != 'PROCESSING':
                        program.status_data = data
                        logger.info(f"Job {job_id} completed with status: {status}")
                        # try extract partner program id
                        try:
                            br = data.get('business_results', [])[0]
                            added = br.get('update_results', {}).get('program_added', {})
                            pid = added.get('program_id', {}).get('requested_value')
                            if pid:
                                program.partner_program_id = pid
                                logger.info(f"Extracted partner program ID: {pid} for job: {job_id}")
                        except Exception as e:
                            logger.debug(f"Could not extract partner program ID for job {job_id}: {e}")
                        program.save()
                        break
                    program.save()
                
                if status == 'PROCESSING':
                    logger.debug(f"Job {job_id} still processing, sleeping 15 seconds")
                    time.sleep(15)
                else:
                    break
            except Exception as e:
                logger.error(f"Error polling status for job {job_id}: {e}")
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

