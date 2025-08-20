import logging
import time

logger = logging.getLogger('ads.requests')

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        # Простий лог запиту
        logger.info(f"🔵 REQUEST: {request.method} {request.path}")
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        logger.info(f"🔴 RESPONSE: {request.method} {request.path} -> {response.status_code} ({duration:.3f}s)")
        
        return response
