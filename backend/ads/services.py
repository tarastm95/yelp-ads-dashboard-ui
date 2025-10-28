import requests
import csv
import threading
import time
import logging
import json
from io import StringIO
from django.conf import settings
from decimal import Decimal
from .models import Program, Report, PartnerCredential, CustomSuggestedKeyword

logger = logging.getLogger(__name__)


def make_yelp_request_with_retry(method, url, **kwargs):
    """
    Make HTTP request to Yelp API with automatic retry on server errors.
    
    Retries up to 3 times with exponential backoff (2s, 4s, 8s) for 5xx errors.
    Does NOT retry on 4xx errors (client errors) as those are permanent.
    
    Args:
        method: HTTP method ('GET', 'POST', 'PUT', 'DELETE')
        url: Full URL to request
        **kwargs: Additional arguments to pass to requests (auth, params, json, etc.)
    
    Returns:
        requests.Response object
    
    Raises:
        requests.HTTPError: For non-retryable errors or after max retries
    """
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            logger.debug(f"Making {method} request to {url} (attempt {attempt}/{max_attempts})")
            resp = requests.request(method, url, **kwargs)
            
            # Only retry on server errors (5xx)
            if resp.status_code >= 500:
                error_msg = f"Server error {resp.status_code} from {url}"
                if attempt < max_attempts:
                    wait_time = 2 ** (attempt - 1)  # Exponential backoff: 1s, 2s, 4s
                    logger.warning(f"{error_msg}, retrying in {wait_time}s (attempt {attempt}/{max_attempts})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"{error_msg}, max retries reached")
                    resp.raise_for_status()
            
            # For client errors (4xx) and success (2xx-3xx), don't retry
            resp.raise_for_status()
            return resp
            
        except requests.RequestException as e:
            # Network errors (connection refused, timeout, etc.) - retry
            if attempt < max_attempts and not isinstance(e, requests.HTTPError):
                wait_time = 2 ** (attempt - 1)
                logger.warning(f"Network error: {e}, retrying in {wait_time}s (attempt {attempt}/{max_attempts})")
                time.sleep(wait_time)
                continue
            raise
    
    # Should never reach here, but just in case
    raise requests.HTTPError(f"Failed after {max_attempts} attempts")

class YelpService:
    PARTNER_BASE = 'https://partner-api.yelp.com'
    FUSION_BASE = 'https://api.yelp.com'
    headers_fusion = {'Authorization': f'Bearer {settings.YELP_FUSION_TOKEN}'}
    
    @classmethod
    def get_business_details(cls, business_id):
        """
        Get business details from Yelp Fusion API.
        
        Args:
            business_id: Yelp business ID
            
        Returns:
            dict: Business details including name, id, location, etc.
        """
        try:
            url = f"{cls.FUSION_BASE}/v3/businesses/{business_id}"
            logger.info(f"🔍 Getting business details for {business_id}")
            
            response = make_yelp_request_with_retry('GET', url, headers=cls.headers_fusion)
            business_data = response.json()
            
            logger.info(f"✅ Got business details: {business_data.get('name')} ({business_data.get('id')})")
            
            return {
                'id': business_data.get('id'),
                'name': business_data.get('name'),
                'alias': business_data.get('alias'),
                'image_url': business_data.get('image_url'),
                'is_closed': business_data.get('is_closed'),
                'url': business_data.get('url'),
                'phone': business_data.get('phone'),
                'display_phone': business_data.get('display_phone'),
                'review_count': business_data.get('review_count'),
                'categories': business_data.get('categories', []),
                'rating': business_data.get('rating'),
                'location': business_data.get('location', {}),
                'coordinates': business_data.get('coordinates', {}),
            }
        except Exception as e:
            logger.error(f"❌ Failed to get business details for {business_id}: {e}")
            # Повертаємо базову інформацію якщо не вдалося отримати деталі
            return {
                'id': business_id,
                'name': business_id,  # Фоллбек на ID якщо немає назви
                'error': str(e)
            }

    @classmethod
    def _get_partner_auth(cls, username=None):
        """
        Return credentials from database first, then fall back to settings.
        
        Args:
            username: Optional username to get specific credentials for
        """
        try:
            # Спочатку намагаємося отримати з бази даних
            if username:
                cred = PartnerCredential.objects.filter(username=username).first()
            else:
                cred = PartnerCredential.objects.order_by('-updated_at').first()
                
            if cred and cred.username and cred.password:
                logger.info(f"🔐 YelpService._get_partner_auth: Using credentials from database for user '{cred.username}'")
                return cred.username, cred.password
        except Exception as e:
            logger.warning(f"⚠️ YelpService._get_partner_auth: Failed to get credentials from database: {e}")
        
        # Фоллбек на .env файл
        logger.info(f"🔐 YelpService._get_partner_auth: Using credentials from .env file")
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
            
            # Always convert from dollars to cents (frontend always sends dollars now)
            budget_dollars = float(budget)
            if budget_dollars < 25:
                raise ValueError("Budget must be at least $25.00")
            params['budget'] = int(budget_dollars * 100)  # Convert dollars to cents
            logger.info(f"Budget: ${budget_dollars} → {params['budget']} cents")

            is_autobid = payload.get('is_autobid')
            if is_autobid is None:
                raise ValueError("CPC program requires is_autobid flag")
            params['is_autobid'] = str(is_autobid).lower()

            if not is_autobid:
                max_bid = payload.get('max_bid')
                if max_bid is None:
                    raise ValueError("max_bid required when is_autobid is false")
                
                # Always convert from dollars to cents (frontend always sends dollars now)
                max_bid_dollars = float(max_bid)
                if max_bid_dollars < 0.25:
                    raise ValueError("Max bid must be at least $0.25")
                params['max_bid'] = int(max_bid_dollars * 100)  # Convert dollars to cents
                logger.info(f"Max bid: ${max_bid_dollars} → {params['max_bid']} cents")

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
            logger.debug(f"Making request to: {url} with retry logic")
            # Partner Advertising API expects query params, not JSON body
            params_filtered = {k: v for k, v in params.items() if v is not None}
            resp = make_yelp_request_with_retry('POST', url, params=params_filtered, auth=cls._get_partner_auth())
            logger.debug(f"Response status: {resp.status_code}")
            logger.debug(f"Response text: {resp.text}")
            
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
        logger.info(f"🔧 Edit: program_id = {program_id}")
        logger.info(f"🔧 Edit: Received payload = {json.dumps(payload, indent=2)}")
        logger.info(f"🔧 Edit: Payload keys = {list(payload.keys())}")
        logger.info(f"🔧 Edit: 'start' in payload? {('start' in payload)}")
        logger.info(f"🔧 Edit: 'end' in payload? {('end' in payload)}")
        
        url = f'{cls.PARTNER_BASE}/v1/reseller/program/{program_id}/edit'

        params = {}

        if 'budget' in payload:
            budget = payload['budget']
            # Always convert from dollars to cents (frontend always sends dollars)
            budget_dollars = float(budget)
            if budget_dollars < 25:
                raise ValueError("Budget must be at least $25.00")
            params['budget'] = int(budget_dollars * 100)
            logger.info(f"Edit: Budget ${budget_dollars} → {params['budget']} cents")

        # Handle bidding strategy
        if 'is_autobid' in payload:
            is_autobid = payload['is_autobid']
            params['is_autobid'] = str(is_autobid).lower()
            logger.info(f"Edit: is_autobid = {is_autobid}")
            
            # If autobid enabled, remove max_bid
            if is_autobid:
                logger.info("Edit: Autobid enabled → max_bid will not be sent")
        
        # Max bid - only for manual bidding
        if 'max_bid' in payload:
            max_bid = payload['max_bid']
            # Always convert from dollars to cents (frontend always sends dollars)
            max_bid_dollars = float(max_bid)
            if max_bid_dollars < 0.25:
                raise ValueError("Max bid must be at least $0.25")
            params['max_bid'] = int(max_bid_dollars * 100)
            logger.info(f"Edit: Max bid ${max_bid_dollars} → {params['max_bid']} cents")
            
            # If max_bid is set without explicit is_autobid, disable autobid
            if 'is_autobid' not in payload:
                params['is_autobid'] = 'false'
                logger.info("Edit: Max bid set without is_autobid → automatically disabling autobid")

        if 'future_budget_date' in payload:
            params['future_budget_date'] = payload['future_budget_date']
        if 'pacing_method' in payload:
            params['pacing_method'] = payload['pacing_method']
        if 'ad_categories' in payload and payload['ad_categories']:
            params['ad_categories'] = ','.join(payload['ad_categories'])
        
        # Start date CAN be edited for INACTIVE programs, but NOT for ACTIVE programs
        if 'start' in payload:
            params['start'] = payload['start']
            logger.info(f"Edit: Start date = {payload['start']} (allowed for INACTIVE programs)")
        
        if 'end' in payload:
            params['end'] = payload['end']
            logger.info(f"Edit: End date = {payload['end']}")

        logger.info(f"📋 Edit: Final params for Yelp API = {json.dumps(params, indent=2)}")
        logger.info(f"📋 Edit: Total params count = {len(params)}")
        logger.info(f"🌐 Edit: Request URL = {url}")

        try:
            params_filtered = {k: v for k, v in params.items() if v is not None}
            resp = make_yelp_request_with_retry('POST', url, params=params_filtered, auth=cls._get_partner_auth())
            logger.debug(f"Edit response status: {resp.status_code}")
            logger.debug(f"Edit response text: {resp.text}")
            
            data = resp.json()
            job_id = data.get('job_id')
            
            # Save or update program in database with PROCESSING status
            if job_id:
                try:
                    # Try to find existing program by partner_program_id
                    program = Program.objects.filter(partner_program_id=program_id).first()
                    
                    if program:
                        # Update existing
                        program.job_id = job_id
                        program.status = 'PROCESSING'
                        program.save()
                        logger.info(f"Updated existing program with new job_id: {job_id}")
                    else:
                        # Create new entry for editing job
                        Program.objects.create(
                            job_id=job_id,
                            partner_program_id=program_id,
                            name='EDIT',
                            budget=0,  # Will be updated when job completes
                            status='PROCESSING',
                        )
                        logger.info(f"Created new program entry for edit job: {job_id}")
                    
                    # Start background polling
                    threading.Thread(target=cls._poll_program_status, args=(job_id,), daemon=True).start()
                    logger.info(f"Started background polling for edit job: {job_id}")
                except Exception as db_error:
                    logger.error(f"Error saving edit job to database: {db_error}")
                    # Don't fail the whole operation
            
            return data
        except Exception as e:
            logger.error(f"Error editing program {program_id}: {e}")
            raise

    @classmethod
    def validate_program_active(cls, program_id):
        """Ensure program exists and can be terminated."""
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
            # Дозволяємо terminate для ACTIVE та INACTIVE (FUTURE) програм
            # Забороняємо тільки для дійсно завершених програм
            if status not in ["ACTIVE", "INACTIVE"]:
                raise ValueError(f"PROGRAM_NOT_ACTIVE_{status}")
        else:
            # Fallback for old format
            status = info.get("program_status") or info.get("status")
            # Дозволяємо terminate для ACTIVE та INACTIVE програм
            if status not in ["ACTIVE", "INACTIVE"]:
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
            logger.info(f"📤 YelpService.pause_program: Making POST request to pause program with retry logic...")
            resp = make_yelp_request_with_retry('POST', url, auth=auth_creds)
            logger.info(f"📥 YelpService.pause_program: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.pause_program: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.pause_program: Raw response text: {resp.text}")
            
            logger.info(f"✅ YelpService.pause_program: Successfully paused program {program_id}")
            return {'status': resp.status_code}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.pause_program: HTTP Error for {program_id}: {e}")
            if e.response is not None:
                logger.error(f"❌ YelpService.pause_program: Response status: {e.response.status_code}")
                logger.error(f"❌ YelpService.pause_program: Response text: {e.response.text}")
                
                # Special handling for 404 - likely means endpoint requires special access
                if e.response.status_code == 404:
                    logger.warning(f"⚠️ YelpService.pause_program: 404 error - This endpoint requires special configuration from Yelp. Please contact Yelp to enable pause/resume access for your account.")
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
            logger.info(f"📤 YelpService.resume_program: Making POST request to resume program with retry logic...")
            resp = make_yelp_request_with_retry('POST', url, auth=auth_creds)
            logger.info(f"📥 YelpService.resume_program: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.resume_program: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.resume_program: Raw response text: {resp.text}")
            
            logger.info(f"✅ YelpService.resume_program: Successfully resumed program {program_id}")
            return {'status': resp.status_code}
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.resume_program: HTTP Error for {program_id}: {e}")
            if e.response is not None:
                logger.error(f"❌ YelpService.resume_program: Response status: {e.response.status_code}")
                logger.error(f"❌ YelpService.resume_program: Response text: {e.response.text}")
                
                # Special handling for 404 - likely means endpoint requires special access
                if e.response.status_code == 404:
                    logger.warning(f"⚠️ YelpService.resume_program: 404 error - This endpoint requires special configuration from Yelp. Please contact Yelp to enable pause/resume access for your account.")
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
            
            # Handle 500 errors gracefully (job_id expired or not found)
            if resp.status_code == 500:
                logger.warning(f"⚠️ YelpService.get_program_status: Job {program_id} not found or expired (500)")
                try:
                    error_data = resp.json()
                    error_id = error_data.get('error', {}).get('id', 'UNKNOWN')
                    error_desc = error_data.get('error', {}).get('description', 'Job not found')
                except:
                    error_id = 'JOB_NOT_FOUND'
                    error_desc = 'Job ID expired or does not exist'
                
                return {
                    'job_id': program_id,
                    'status': 'UNKNOWN',
                    'error': {
                        'id': error_id,
                        'description': error_desc
                    },
                    'message': 'Job not found in Yelp system (may have expired)'
                }
            
            # Handle 404 errors gracefully
            if resp.status_code == 404:
                logger.warning(f"⚠️ YelpService.get_program_status: Job {program_id} not found (404)")
                return {
                    'job_id': program_id,
                    'status': 'NOT_FOUND',
                    'error': {
                        'id': 'JOB_NOT_FOUND',
                        'description': 'Job ID not found'
                    },
                    'message': 'Job not found in Yelp system'
                }
            
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
        resp = make_yelp_request_with_retry('GET', url, auth=cls._get_partner_auth())
        return resp.json()

    @classmethod
    def get_all_programs(cls, offset=0, limit=20, program_status='CURRENT', username=None):
        """
        Return list of programs from Yelp API with pagination. Enriches data with full program info.
        
        Args:
            offset: Offset for pagination
            limit: Limit for pagination
            program_status: Status filter
            username: Optional username for authentication
        """
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
        auth_creds = cls._get_partner_auth(username=username)
        logger.info(f"🔐 YelpService.get_all_programs: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.get_all_programs: Making GET request to Yelp API with retry logic...")
            resp = make_yelp_request_with_retry('GET', url, params=params, auth=auth_creds)
            logger.info(f"📥 YelpService.get_all_programs: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.get_all_programs: Response headers: {dict(resp.headers)}")

            data = resp.json()
            logger.info(f"✅ YelpService.get_all_programs: Successfully parsed JSON response")

            # Yelp API повертає 'payment_programs' замість 'programs'
            programs = data.get('payment_programs', [])
            logger.info(f"📊 YelpService.get_all_programs: Found {len(programs)} programs")

            # Enrich programs with full data from /v1/programs/info/{id} for programs missing budget
            enriched_programs = []
            for program in programs:
                # Check if program has budget in program_metrics
                has_budget = program.get('program_metrics', {}).get('budget') is not None
                
                if not has_budget:
                    # Fetch full program info to get budget
                    program_id = program.get('program_id')
                    logger.info(f"📥 Enriching program {program_id} with full data (missing budget)")
                    try:
                        full_info_url = f'{cls.PARTNER_BASE}/v1/programs/info/{program_id}'
                        full_resp = requests.get(full_info_url, auth=auth_creds, timeout=5)
                        full_resp.raise_for_status()
                        full_data = full_resp.json()
                        
                        # Get first program from response
                        full_programs = full_data.get('programs', [])
                        if full_programs:
                            full_program = full_programs[0]
                            # Merge program_metrics from full response
                            if 'program_metrics' in full_program:
                                if 'program_metrics' not in program:
                                    program['program_metrics'] = {}
                                program['program_metrics'].update(full_program['program_metrics'])
                                logger.info(f"✅ Enriched {program_id} with budget: ${full_program['program_metrics'].get('budget', 0) / 100}")
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to enrich program {program_id}: {e}")
                
                # Add yelp_business_id to top level for easier access
                businesses = program.get('businesses', [])
                if businesses and len(businesses) > 0:
                    program['yelp_business_id'] = businesses[0].get('yelp_business_id')
                    program['partner_business_id'] = businesses[0].get('partner_business_id')
                else:
                    program['yelp_business_id'] = None
                    program['partner_business_id'] = None
                
                enriched_programs.append(program)

            # Перетворюємо у формат, очікуваний frontend
            normalized_data = {
                'programs': enriched_programs,
                'total_count': data.get('total', 0),
                'offset': data.get('offset', offset),
                'limit': data.get('limit', limit)
            }

            return normalized_data
        except requests.HTTPError as e:
            logger.error(f"❌ YelpService.get_all_programs: HTTP Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"❌ YelpService.get_all_programs: Response status: {e.response.status_code}")
                logger.error(f"❌ YelpService.get_all_programs: Response text: {e.response.text}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"❌ YelpService.get_all_programs: Failed to decode JSON: {e}")
            raise ValueError("Invalid JSON from Yelp API") from e
        except Exception as e:
            logger.error(f"❌ YelpService.get_all_programs: Unexpected error: {e}")
            raise

    @classmethod
    def get_program_features(cls, program_id):
        """Get available and active features for a specific program.
        Merges Yelp suggested keywords with custom suggested keywords for NEGATIVE_KEYWORD_TARGETING."""
        logger.info(f"🔍 YelpService.get_program_features: Getting features for program '{program_id}'")
        url = f'{cls.PARTNER_BASE}/program/{program_id}/features/v1'
        logger.info(f"🌐 YelpService.get_program_features: Request URL: {url}")
        
        # Логуємо автентифікацію
        auth_creds = cls._get_partner_auth()
        logger.info(f"🔐 YelpService.get_program_features: Using auth credentials - username: '{auth_creds[0]}', password: '{auth_creds[1][:4]}***'")
        
        try:
            logger.info(f"📤 YelpService.get_program_features: Making GET request to Yelp API with retry logic...")
            resp = make_yelp_request_with_retry('GET', url, auth=auth_creds)
            logger.info(f"📥 YelpService.get_program_features: Response status code: {resp.status_code}")
            logger.info(f"📥 YelpService.get_program_features: Response headers: {dict(resp.headers)}")
            logger.info(f"📥 YelpService.get_program_features: Raw response text: {resp.text}")
            
            data = resp.json()
            logger.info(f"✅ YelpService.get_program_features: Successfully parsed JSON response")
            logger.info(f"📊 YelpService.get_program_features: Program {program_id} features: {list(data.get('features', {}).keys())}")
            
            # Merge custom suggested keywords with Yelp suggested keywords for NEGATIVE_KEYWORD_TARGETING
            if 'features' in data and 'NEGATIVE_KEYWORD_TARGETING' in data['features']:
                try:
                    negative_kw_feature = data['features']['NEGATIVE_KEYWORD_TARGETING']
                    yelp_suggested = negative_kw_feature.get('suggested_keywords', [])
                    
                    # Get custom suggested keywords from database (safely)
                    try:
                        custom_keywords = CustomSuggestedKeyword.objects.filter(
                            program_id=program_id
                        ).values_list('keyword', flat=True)
                    except Exception as db_error:
                        logger.warning(f"⚠️ YelpService.get_program_features: Could not fetch custom keywords (table might not exist): {db_error}")
                        custom_keywords = []
                    
                    # Merge and deduplicate
                    all_suggested = list(set(yelp_suggested + list(custom_keywords)))
                    negative_kw_feature['suggested_keywords'] = sorted(all_suggested)
                    
                    logger.info(f"📊 YelpService.get_program_features: Merged suggested keywords - "
                               f"Yelp: {len(yelp_suggested)}, Custom: {len(custom_keywords)}, Total: {len(all_suggested)}")
                except Exception as merge_error:
                    logger.error(f"❌ YelpService.get_program_features: Error merging keywords: {merge_error}")
            
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
    def duplicate_program(cls, original_program_id, new_program_data):
        """
        Duplicate an existing program with new dates and budget.
        Copies all features from the original program to the new one.
        
        Args:
            original_program_id (str): ID of the program to duplicate
            new_program_data (dict): New program parameters (start, end, budget, etc.)
        
        Returns:
            dict: New program creation response with job_id and copied features info
        """
        logger.info(f"🔄 YelpService.duplicate_program: Starting duplication of program '{original_program_id}'")
        
        try:
            # Step 1: Get original program info
            logger.info(f"📥 Step 1/5: Getting original program info...")
            original_info = cls.get_program_info(original_program_id)
            logger.info(f"📊 Original info structure keys: {list(original_info.keys())}")
            
            # Extract business_id - handle multiple response formats
            business_id = None
            program_data = None
            
            # Format 1: Direct businesses array (from /programs/v1)
            if 'businesses' in original_info and len(original_info['businesses']) > 0:
                business_id = original_info['businesses'][0]['yelp_business_id']
                program_data = original_info
                logger.info(f"✅ Format 1: Found business_id in direct businesses array")
            
            # Format 2: Wrapped in programs array (from /v1/programs/info/{id})
            elif 'programs' in original_info and len(original_info['programs']) > 0:
                program_data = original_info['programs'][0]
                # Check for businesses array first
                if 'businesses' in program_data and len(program_data['businesses']) > 0:
                    business_id = program_data['businesses'][0]['yelp_business_id']
                    logger.info(f"✅ Format 2a: Found business_id in businesses array within programs")
                # Or direct yelp_business_id field (this is the actual format!)
                elif 'yelp_business_id' in program_data:
                    business_id = program_data['yelp_business_id']
                    logger.info(f"✅ Format 2b: Found business_id as direct field in program")
            
            # Format 3: Direct yelp_business_id field (legacy format)
            elif 'yelp_business_id' in original_info:
                business_id = original_info['yelp_business_id']
                program_data = original_info
                logger.info(f"✅ Format 3: Found direct yelp_business_id field")
            
            if not business_id or not program_data:
                logger.error(f"❌ Response structure: {original_info}")
                raise ValueError(f"Could not extract business_id from original program. Available keys: {list(original_info.keys())}")
            
            logger.info(f"✅ Original program business_id: {business_id}")
            
            # Step 2: Get original program features
            logger.info(f"📥 Step 2/5: Getting original program features...")
            try:
                original_features = cls.get_program_features(original_program_id)
                features_to_copy = original_features.get('features', {})
                logger.info(f"✅ Found {len(features_to_copy)} features to copy: {list(features_to_copy.keys())}")
            except Exception as e:
                logger.warning(f"⚠️ Could not get features (will create without features): {e}")
                features_to_copy = {}
            
            # Step 3: Prepare new program creation payload
            logger.info(f"📝 Step 3/5: Preparing new program creation...")
            program_type = program_data.get('program_type', 'CPC')
            
            # Get budget from new_program_data (already in DOLLARS from frontend)
            budget_dollars = new_program_data.get('budget')
            logger.info(f"📊 Budget from request: ${budget_dollars} (dollars)")
            
            create_payload = {
                'business_id': business_id,
                'program_name': program_type,
                'start': new_program_data.get('start_date'),
                'end': new_program_data.get('end_date'),
                'budget': budget_dollars,  # Pass as dollars - create_program will convert
            }
            
            # Copy additional parameters from original if not provided in new_program_data
            if program_type == 'CPC':
                metrics = program_data.get('program_metrics', {})
                create_payload['is_autobid'] = new_program_data.get('is_autobid', metrics.get('is_autobid', True))
                
                if not create_payload['is_autobid']:
                    # Convert max_bid from dollars to cents
                    max_bid_dollars = new_program_data.get('max_bid')
                    if max_bid_dollars:
                        create_payload['max_bid'] = int(max_bid_dollars * 100)
                    elif metrics.get('max_bid'):
                        create_payload['max_bid'] = metrics.get('max_bid')  # Already in cents
                
                create_payload['currency'] = new_program_data.get('currency', metrics.get('currency', 'USD'))
                
                # Only add pacing_method if explicitly provided by user
                # Don't copy from original as it might not be compatible
                pacing_method = new_program_data.get('pacing_method')
                if pacing_method:
                    create_payload['pacing_method'] = pacing_method
                
                # NOTE: fee_period is READ-ONLY and set by Yelp based on account settings
                # Do NOT copy it from original program - it will cause FEE_PERIOD_TYPE_NOT_SUPPORTED_ERROR
            
            logger.info(f"📤 Creating new program with payload: {create_payload}")
            
            # Step 4: Create new program
            new_program_response = cls.create_program(create_payload)
            new_job_id = new_program_response['job_id']
            logger.info(f"✅ Step 4/5: New program created with job_id: {new_job_id}")
            
            # Step 5: Return job_id immediately and copy features in background
            logger.info(f"✅ Step 5/5: Program creation started, will copy features in background")
            
            # Start background thread to wait for completion and copy features
            def copy_features_when_ready():
                """Background task to wait for program creation and copy features"""
                try:
                    logger.info(f"🔄 Background: Starting feature copy task for job {new_job_id}")
                    
                    # Poll status until completed
                    max_attempts = 40
                    attempt = 0
                    new_program_id = None
                    
                    while attempt < max_attempts:
                        time.sleep(15)
                        attempt += 1
                        
                        try:
                            status_data = cls.get_program_status(new_job_id)
                            status_value = status_data.get('status')
                            logger.info(f"🔄 Background poll {attempt}/{max_attempts}: status = {status_value}")
                            
                            if status_value == 'COMPLETED':
                                br = status_data.get('business_results', [])[0]
                                added = br.get('update_results', {}).get('program_added', {})
                                new_program_id = added.get('program_id', {}).get('requested_value')
                                logger.info(f"✅ Background: Program ID extracted: {new_program_id}")
                                break
                            elif status_value in ['FAILED', 'ERROR', 'REJECTED']:
                                logger.error(f"❌ Background: Program creation failed with status: {status_value}")
                                return
                        except Exception as e:
                            logger.error(f"❌ Background: Error polling: {e}")
                            return
                    
                    # Copy features if program created successfully
                    if new_program_id and features_to_copy and new_program_data.get('copy_features', True):
                        logger.info(f"📋 Background: Copying {len(features_to_copy)} features to {new_program_id} ONE BY ONE...")
                        
                        # Define copy order based on dependencies
                        # Features that provide data should be copied before features that use that data
                        COPY_ORDER = [
                            # Phase 1: Independent features (no dependencies)
                            'CUSTOM_RADIUS_TARGETING',
                            'AD_SCHEDULING',
                            'STRICT_CATEGORY_TARGETING',
                            'CUSTOM_LOCATION_TARGETING',
                            'NEGATIVE_KEYWORD_TARGETING',
                            'SERVICE_OFFERINGS_TARGETING',
                            'BUSINESS_HIGHLIGHTS',
                            'VERIFIED_LICENSE',
                            
                            # Phase 2: Features that provide data for others
                            'LINK_TRACKING',        # Provides URL for AD_GOAL
                            'CALL_TRACKING',        # Provides phone for AD_GOAL
                            'CUSTOM_AD_TEXT',
                            'CUSTOM_AD_PHOTO',
                            'BUSINESS_LOGO',
                            'YELP_PORTFOLIO',
                            
                            # Phase 3: Features that depend on others (LAST!)
                            'AD_GOAL',              # Depends on LINK_TRACKING or CALL_TRACKING
                        ]
                        
                        # Sort features by dependency order
                        ordered_features = []
                        for feature_type in COPY_ORDER:
                            if feature_type in features_to_copy:
                                ordered_features.append((feature_type, features_to_copy[feature_type]))
                        
                        # Add any remaining features not in COPY_ORDER (just in case)
                        for feature_type, feature_data in features_to_copy.items():
                            if feature_type not in COPY_ORDER:
                                ordered_features.append((feature_type, feature_data))
                                logger.warning(f"⚠️ Feature {feature_type} not in COPY_ORDER, adding at end")
                        
                        logger.info(f"📝 Copy order: {[f[0] for f in ordered_features]}")
                        
                        # Copy features ONE BY ONE
                        copied_count = 0
                        failed_features = []
                        
                        for feature_type, feature_data in ordered_features:
                            try:
                                logger.info(f"📤 Copying feature {copied_count + 1}/{len(ordered_features)}: {feature_type}")
                                features_payload = {'features': {feature_type: feature_data}}
                                cls.update_program_features(new_program_id, features_payload)
                                copied_count += 1
                                logger.info(f"✅ Feature {feature_type} copied successfully")
                            except Exception as e:
                                failed_features.append((feature_type, str(e)))
                                logger.error(f"❌ Failed to copy {feature_type}: {e}")
                                # Continue with next feature even if this one failed
                        
                        logger.info(f"✅ Background: Feature copy complete - Success: {copied_count}/{len(ordered_features)}, Failed: {len(failed_features)}")
                        if failed_features:
                            logger.warning(f"⚠️ Failed features: {[(f[0], f[1][:100]) for f in failed_features]}")
                    else:
                        logger.warning(f"⚠️ Background: Skipping feature copy - program_id={new_program_id}, features={len(features_to_copy) if features_to_copy else 0}, copy_flag={new_program_data.get('copy_features')}")
                        
                except Exception as e:
                    logger.error(f"❌ Background: Feature copy task failed: {e}")
            
            # Start background thread
            if new_program_data.get('copy_features', True) and features_to_copy:
                threading.Thread(target=copy_features_when_ready, daemon=True).start()
                logger.info(f"🚀 Background thread started to copy {len(features_to_copy)} features when program is ready")
            
            return {
                'job_id': new_job_id,
                'program_id': None,  # Will be set by background task
                'original_program_id': original_program_id,
                'copied_features': list(features_to_copy.keys()) if features_to_copy else [],  # Show what WILL be copied
                'message': f'Program is being created. {len(features_to_copy) if features_to_copy else 0} features will be copied when ready.'
            }
            
        except Exception as e:
            logger.error(f"❌ YelpService.duplicate_program: Error duplicating program: {e}")
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

