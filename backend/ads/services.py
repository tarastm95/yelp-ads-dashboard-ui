import requests
import csv
import threading
import time
import logging
from io import StringIO
from django.conf import settings
from decimal import Decimal
from .models import Program, Report, PartnerCredential

logger = logging.getLogger(__name__)

class YelpService:
    PARTNER_BASE = 'https://partner-api.yelp.com'
    FUSION_BASE = 'https://api.yelp.com'
    headers_fusion = {'Authorization': f'Bearer {settings.YELP_FUSION_TOKEN}'}

    @classmethod
    def _get_partner_auth(cls):
        """Return credentials from settings (bypassing database for now)."""
        # TODO: Uncomment database lookup when DB is available
        # try:
        #     cred = PartnerCredential.objects.order_by('-updated_at').first()
        #     if cred:
        #         return cred.username, cred.password
        # except Exception:
        #     pass  # Fall back to settings if DB is not available
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

            budget_cents = params.get('budget', 0)
            budget_dollars = (
                Decimal(budget_cents) / Decimal('100') if budget_cents is not None else 0
            )

            program = Program.objects.create(
                job_id=data['job_id'],
                name=program_type,
                budget=budget_dollars,
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
    def validate_program_active(cls, program_id):
        """Ensure program exists and is currently active."""
        try:
            info = cls.get_program_info(program_id)
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 404:
                raise ValueError("PROGRAM_NOT_FOUND")
            raise

        # Check if response has programs array (new API format)
        if 'programs' in info and len(info['programs']) > 0:
            program = info['programs'][0]
            status = program.get("program_status")
            if status != "ACTIVE":
                if status == "INACTIVE":
                    raise ValueError("PROGRAM_HAS_EXPIRED")
                else:
                    raise ValueError(f"PROGRAM_NOT_ACTIVE_{status}")
        else:
            # Fallback for old format
            status = info.get("program_status") or info.get("status")
            if status != "ACTIVE":
                raise ValueError("PROGRAM_HAS_EXPIRED")

        return info

    @classmethod
    def terminate_program(cls, program_id):
        try:
            cls.validate_program_active(program_id)
        except ValueError as e:
            return {"detail": str(e)}

        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/end'
        resp = requests.post(url, auth=cls._get_partner_auth())
        resp.raise_for_status()
        return resp.json()

    @classmethod
    def pause_program(cls, program_id):
        logger.info(f"🔄 YelpService.pause_program: Starting pause for program_id '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/pause/v1'
        logger.info(f"🌐 YelpService.pause_program: Request URL: {url}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.pause_program: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.pause_program: Making POST request to pause program...")
            resp = requests.post(url, auth=auth_creds)
            logger.info(f"📥 YelpService.pause_program: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.pause_program: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.pause_program: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            logger.info(f"✅ YelpService.pause_program: Successfully paused program {program_id}")
            return {'status': resp.status_code}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.pause_program: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.pause_program: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.pause_program: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.pause_program: Unexpected error for {program_id}: {e}")
            raise

    @classmethod
    def resume_program(cls, program_id):
        logger.info(f"🔄 YelpService.resume_program: Starting resume for program_id '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/resume/v1'
        logger.info(f"🌐 YelpService.resume_program: Request URL: {url}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.resume_program: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.resume_program: Making POST request to resume program...")
            resp = requests.post(url, auth=auth_creds)
            logger.info(f"📥 YelpService.resume_program: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.resume_program: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.resume_program: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            logger.info(f"✅ YelpService.resume_program: Successfully resumed program {program_id}")
            return {'status': resp.status_code}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.resume_program: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.resume_program: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.resume_program: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.resume_program: Unexpected error for {program_id}: {e}")
            raise

    @classmethod
    def get_program_status(cls, program_id):
        logger.info(f"🔍 YelpService.get_program_status: Starting request for program_id '{program_id}'")
        url = f'{cls.PARTNER_BASE}/v1/reseller/status/{program_id}'
        logger.info(f"🌐 YelpService.get_program_status: Request URL: {url}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.get_program_status: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.get_program_status: Making GET request to Yelp API...")
            resp = requests.get(url, auth=auth_creds)
            logger.info(f"📥 YelpService.get_program_status: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.get_program_status: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.get_program_status: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.get_program_status: Successfully parsed JSON response")
            logger.info(f"📊 YelpService.get_program_status: Program {program_id} status: {data.get('status')}")
            logger.info(f"📊 YelpService.get_program_status: Full response data: {data}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_program_status: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.get_program_status: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.get_program_status: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.get_program_status: Unexpected error for {program_id}: {e}")
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

    @classmethod
    def get_all_programs(cls, offset=0, limit=20, program_status='CURRENT'):
        """Return list of programs from Yelp API with pagination."""
        logger.info(f"Getting programs list from Yelp API - offset: {offset}, limit: {limit}, status: {program_status}")
        url = f'{cls.PARTNER_BASE}/programs/v1'
        
        params = {
            'offset': offset,
            'limit': limit,
            'program_status': program_status
        }
        
        logger.info(f"🌐 YelpService.get_all_programs: Request URL: {url}")
        logger.info(f"📝 YelpService.get_all_programs: Request params: {params}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.get_all_programs: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.get_all_programs: Making GET request to Yelp API...")
            resp = requests.get(url, params=params, auth=auth_creds)
            logger.info(f"📥 YelpService.get_all_programs: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.get_all_programs: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.get_all_programs: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.get_all_programs: Successfully parsed JSON response")
            
            # Yelp API повертає 'payment_programs' замість 'programs'
            programs = data.get('payment_programs', [])
            logger.info(f"📊 YelpService.get_all_programs: Found {len(programs)} programs")
            
            # Перетворюємо у формат, очікуваний frontend
            normalized_data = {
                'programs': programs,
                'total_count': data.get('total', 0),
                'offset': data.get('offset', offset),
                'limit': data.get('limit', limit)
            }
            
            return normalized_data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_all_programs: HTTP Error: {e}")
            logger.error(f"❌ YelpService.get_all_programs: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.get_all_programs: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.get_all_programs: Unexpected error: {e}")
            raise

    @classmethod
    def get_program_features(cls, program_id):
        """Get available and active features for a specific program."""
        logger.info(f"🔍 YelpService.get_program_features: Getting features for program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/features/v1'
        logger.info(f"🌐 YelpService.get_program_features: Request URL: {url}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.get_program_features: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.get_program_features: Making GET request to Yelp API...")
            resp = requests.get(url, auth=auth_creds)
            logger.info(f"📥 YelpService.get_program_features: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.get_program_features: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.get_program_features: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.get_program_features: Successfully parsed JSON response")
            logger.info(f"📊 YelpService.get_program_features: Program {program_id} features: {list(data.get('features', {}).keys())}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_program_features: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.get_program_features: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.get_program_features: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.get_program_features: Unexpected error for {program_id}: {e}")
            raise

    @classmethod
    def update_program_features(cls, program_id, features_payload):
        """Update features for a specific program."""
        logger.info(f"🔧 YelpService.update_program_features: Updating features for program '{program_id}'")
        logger.info(f"📝 YelpService.update_program_features: Payload: {features_payload}")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/features/v1'
        logger.info(f"🌐 YelpService.update_program_features: Request URL: {url}")
        
        # Витягуємо features контент з wrapper'а (Django serializer надсилає {"features": {...}})
        # Але Yelp API очікує тільки контент всередині features
        if 'features' in features_payload:
            yelp_payload = features_payload['features']
            logger.info(f"📦 YelpService.update_program_features: Extracted features from wrapper: {yelp_payload}")
        else:
            yelp_payload = features_payload
            logger.info(f"📦 YelpService.update_program_features: No wrapper found, using payload as-is: {yelp_payload}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.update_program_features: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            # Додаємо явний Content-Type header
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            logger.info(f"📤 YelpService.update_program_features: Making POST request to Yelp API...")
            logger.info(f"📋 YelpService.update_program_features: Request headers: {headers}")
            
            # Логуємо точний JSON що відправляється до Yelp API
            import json
            json_data = json.dumps(yelp_payload, ensure_ascii=False, indent=2)
            logger.info(f"📄 YelpService.update_program_features: Exact JSON being sent to Yelp API: {json_data}")
            
            resp = requests.post(url, json=yelp_payload, auth=auth_creds, headers=headers)
            logger.info(f"📥 YelpService.update_program_features: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.update_program_features: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.update_program_features: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.update_program_features: Successfully updated features for program {program_id}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.update_program_features: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.update_program_features: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.update_program_features: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.update_program_features: Unexpected error for {program_id}: {e}")
            raise

    @classmethod
    def delete_program_features(cls, program_id, features_list):
        """Delete/disable specific features for a program.
        
        Args:
            program_id (str): The program ID
            features_list (list): List of feature types to disable (e.g., ["LINK_TRACKING", "AD_GOAL"])
        
        Returns:
            dict: Response with features set to disabled state (null/empty values)
        """
        logger.info(f"🗑️ YelpService.delete_program_features: Deleting features for program '{program_id}'")
        logger.info(f"📝 YelpService.delete_program_features: Features to delete: {features_list}")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/features/v1'
        logger.info(f"🌐 YelpService.delete_program_features: Request URL: {url}")
        
        # Формуємо payload згідно документації Yelp
        delete_payload = {"features": features_list}
        logger.info(f"📝 YelpService.delete_program_features: Delete payload: {delete_payload}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.delete_program_features: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.delete_program_features: Making DELETE request to Yelp API...")
            resp = requests.delete(url, json=delete_payload, auth=auth_creds)
            logger.info(f"📥 YelpService.delete_program_features: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.delete_program_features: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.delete_program_features: Raw response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.delete_program_features: Successfully deleted features for program {program_id}")
            logger.info(f"📊 YelpService.delete_program_features: Remaining features: {list(data.get('features', {}).keys())}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.delete_program_features: HTTP Error for {program_id}: {e}")
            logger.error(f"❌ YelpService.delete_program_features: Response status: {e.response.status_code}")
            logger.error(f"❌ YelpService.delete_program_features: Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.delete_program_features: Unexpected error for {program_id}: {e}")
            raise

    # ============= Portfolio API Methods =============
    
    @classmethod
    def get_portfolio_project(cls, program_id, project_id):
        """Get portfolio project details."""
        logger.info(f"🎨 YelpService.get_portfolio_project: Getting project '{project_id}' for program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/v1'
        logger.info(f"🌐 YelpService.get_portfolio_project: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            logger.info(f"📤 YelpService.get_portfolio_project: Making GET request...")
            resp = requests.get(url, auth=auth_creds)
            logger.info(f"📥 YelpService.get_portfolio_project: Response status: {resp.status_code}")
            logger.info(f"📥 YelpService.get_portfolio_project: Response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.get_portfolio_project: Successfully retrieved project {project_id}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_portfolio_project: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.get_portfolio_project: Unexpected error: {e}")
            raise

    @classmethod
    def update_portfolio_project(cls, program_id, project_id, project_data):
        """Update an existing portfolio project."""
        logger.info(f"🎨 YelpService.update_portfolio_project: Updating project '{project_id}' for program '{program_id}'")
        logger.info(f"📝 YelpService.update_portfolio_project: Project data: {project_data}")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/v1'
        logger.info(f"🌐 YelpService.update_portfolio_project: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            logger.info(f"📤 YelpService.update_portfolio_project: Making PUT request...")
            resp = requests.put(url, json=project_data, auth=auth_creds, headers=headers)
            logger.info(f"📥 YelpService.update_portfolio_project: Response status: {resp.status_code}")
            logger.info(f"📥 YelpService.update_portfolio_project: Response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.update_portfolio_project: Successfully updated project {project_id}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.update_portfolio_project: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.update_portfolio_project: Unexpected error: {e}")
            raise

    @classmethod
    def create_portfolio_project(cls, program_id):
        """Create a new portfolio project draft."""
        logger.info(f"🎨 YelpService.create_portfolio_project: Creating new project for program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/v1'
        logger.info(f"🌐 YelpService.create_portfolio_project: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            logger.info(f"📤 YelpService.create_portfolio_project: Making POST request...")
            resp = requests.post(url, auth=auth_creds)
            logger.info(f"📥 YelpService.create_portfolio_project: Response status: {resp.status_code}")
            logger.info(f"📥 YelpService.create_portfolio_project: Response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.create_portfolio_project: Successfully created project: {data.get('project_id')}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.create_portfolio_project: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.create_portfolio_project: Unexpected error: {e}")
            raise

    @classmethod
    def delete_portfolio_project(cls, program_id, project_id):
        """Delete a portfolio project."""
        logger.info(f"🗑️ YelpService.delete_portfolio_project: Deleting project '{project_id}' for program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/v1'
        logger.info(f"🌐 YelpService.delete_portfolio_project: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            logger.info(f"📤 YelpService.delete_portfolio_project: Making DELETE request...")
            resp = requests.delete(url, auth=auth_creds)
            logger.info(f"📥 YelpService.delete_portfolio_project: Response status: {resp.status_code}")
            
            resp.raise_for_status()
            logger.info(f"✅ YelpService.delete_portfolio_project: Successfully deleted project {project_id}")
            return {'status': 'deleted'}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.delete_portfolio_project: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.delete_portfolio_project: Unexpected error: {e}")
            raise

    @classmethod
    def upload_portfolio_photo(cls, program_id, project_id, photo_data):
        """Upload a photo to a portfolio project."""
        logger.info(f"📸 YelpService.upload_portfolio_photo: Uploading photo for project '{project_id}' in program '{program_id}'")
        logger.info(f"📝 YelpService.upload_portfolio_photo: Photo data: {photo_data}")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/photos/v1'
        logger.info(f"🌐 YelpService.upload_portfolio_photo: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            logger.info(f"📤 YelpService.upload_portfolio_photo: Making POST request...")
            resp = requests.post(url, json=photo_data, auth=auth_creds, headers=headers)
            logger.info(f"📥 YelpService.upload_portfolio_photo: Response status: {resp.status_code}")
            logger.info(f"📥 YelpService.upload_portfolio_photo: Response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.upload_portfolio_photo: Successfully uploaded photo: {data.get('photo_id')}")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.upload_portfolio_photo: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.upload_portfolio_photo: Unexpected error: {e}")
            raise

    @classmethod
    def get_portfolio_photos(cls, program_id, project_id):
        """Get all photos for a portfolio project."""
        logger.info(f"📸 YelpService.get_portfolio_photos: Getting photos for project '{project_id}' in program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/photos/v1'
        logger.info(f"🌐 YelpService.get_portfolio_photos: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            logger.info(f"📤 YelpService.get_portfolio_photos: Making GET request...")
            resp = requests.get(url, auth=auth_creds)
            logger.info(f"📥 YelpService.get_portfolio_photos: Response status: {resp.status_code}")
            logger.info(f"📥 YelpService.get_portfolio_photos: Response text: {resp.text}")
            
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"✅ YelpService.get_portfolio_photos: Successfully retrieved {len(data)} photos")
            return data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_portfolio_photos: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.get_portfolio_photos: Unexpected error: {e}")
            raise

    @classmethod
    def delete_portfolio_photo(cls, program_id, project_id, photo_id):
        """Delete a photo from a portfolio project."""
        logger.info(f"🗑️ YelpService.delete_portfolio_photo: Deleting photo '{photo_id}' from project '{project_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/portfolio/{project_id}/photos/{photo_id}/v1'
        logger.info(f"🌐 YelpService.delete_portfolio_photo: Request URL: {url}")
        
        auth_creds = cls._get_partner_auth()
        
        try:
            logger.info(f"📤 YelpService.delete_portfolio_photo: Making DELETE request...")
            resp = requests.delete(url, auth=auth_creds)
            logger.info(f"📥 YelpService.delete_portfolio_photo: Response status: {resp.status_code}")
            
            resp.raise_for_status()
            logger.info(f"✅ YelpService.delete_portfolio_photo: Successfully deleted photo {photo_id}")
            return {'status': 'deleted'}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.delete_portfolio_photo: HTTP Error: {e}")
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ YelpService.delete_portfolio_photo: Unexpected error: {e}")
            raise

