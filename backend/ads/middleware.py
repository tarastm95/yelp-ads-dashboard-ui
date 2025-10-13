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


class SimpleCorsMiddleware:
    """Simple CORS middleware without external dependencies."""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle preflight OPTIONS requests
        if request.method == 'OPTIONS':
            response = self._create_cors_response()
        else:
            response = self.get_response(request)
            
        # Add CORS headers to all responses
        self._add_cors_headers(response)
        return response
    
    def _create_cors_response(self):
        """Create a response for preflight OPTIONS requests."""
        from django.http import HttpResponse
        response = HttpResponse()
        response.status_code = 200
        return response
    
    def _add_cors_headers(self, response):
        """Add CORS headers to response."""
        # Allow multiple origins for development and production
        allowed_origins = [
            "http://localhost:8080",
            "http://127.0.0.1:8080", 
            "http://72.60.66.164:8080",
            "http://72.60.66.164"
        ]
        
        # For simplicity, we'll use * for now (not recommended for production with credentials)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response["Access-Control-Allow-Credentials"] = "false"  # Must be false when using *
        response["Access-Control-Max-Age"] = "86400"  # 24 hours
