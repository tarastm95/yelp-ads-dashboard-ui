import logging
import time

logger = logging.getLogger('ads.requests')

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        # Детальний лог запиту
        logger.info(f"🔵 REQUEST: {request.method} {request.path}")
        
        # Додаткове логування для Program Features API
        if '/program/' in request.path and '/features/' in request.path:
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: {request.method} {request.path}")
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: Headers: {dict(request.headers)}")
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: Content-Type: {getattr(request, 'content_type', 'Unknown')}")
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: User-Agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')}")
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: Referer: {request.META.get('HTTP_REFERER', 'Unknown')}")
            logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: Remote IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
            
            # Логування body для POST/PUT/DELETE
            if request.method in ['POST', 'PUT', 'DELETE']:
                try:
                    body = request.body.decode('utf-8') if request.body else 'Empty body'
                    logger.info(f"🎯 PROGRAM_FEATURES_REQUEST: Body: {body[:1000]}{'...' if len(body) > 1000 else ''}")
                except Exception as e:
                    logger.warning(f"🎯 PROGRAM_FEATURES_REQUEST: Could not decode body: {e}")
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        logger.info(f"🔴 RESPONSE: {request.method} {request.path} -> {response.status_code} ({duration:.3f}s)")
        
        # Додаткове логування відповіді для Program Features API
        if '/program/' in request.path and '/features/' in request.path:
            logger.info(f"🎯 PROGRAM_FEATURES_RESPONSE: Status {response.status_code} for {request.method} {request.path}")
            logger.info(f"🎯 PROGRAM_FEATURES_RESPONSE: Duration: {duration:.3f}s")
            if hasattr(response, 'data'):
                logger.info(f"🎯 PROGRAM_FEATURES_RESPONSE: Response data type: {type(response.data)}")
        
        return response
