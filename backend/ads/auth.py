from rest_framework.authentication import BasicAuthentication
from rest_framework import exceptions
from rest_framework.permissions import BasePermission
from .models import PartnerCredential
import logging

logger = logging.getLogger(__name__)

class StoringBasicAuthentication(BasicAuthentication):
    """
    Basic auth that saves credentials for later partner API use.
    
    Modified to not send WWW-Authenticate challenge header.
    """

    def authenticate(self, request):
        """Override to add logging and handle authentication"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        logger.info(f"🔐 StoringBasicAuthentication.authenticate: Authorization header present: {bool(auth_header)}")
        if auth_header:
            logger.info(f"🔐 Authorization header starts with: {auth_header[:20]}...")
        
        # Try to authenticate
        try:
            result = super().authenticate(request)
            if result:
                logger.info(f"🔐 Authentication successful for user: {result[0].username}")
            else:
                logger.warning(f"🔐 Authentication returned None")
            return result
        except exceptions.AuthenticationFailed as e:
            logger.error(f"🔐 Authentication failed: {e}")
            # Re-raise the exception so DRF can handle it
            raise

    def authenticate_header(self, request):
        """
        DO NOT return WWW-Authenticate header to prevent browser popup.
        
        Returning None tells DRF not to add WWW-Authenticate header,
        which prevents the browser from showing its built-in login dialog.
        """
        logger.info(f"🔐 authenticate_header called - returning None to prevent browser popup")
        return None

    def authenticate_credentials(self, userid, password, request=None):
        """
        Authenticate without checking Django User model.
        
        Unlike standard BasicAuthentication, we don't validate against
        Django's User table. Instead, we accept any credentials and save
        them for later use with Yelp Partner API.
        """
        logger.info(f"🔐 authenticate_credentials called for user: {userid}")
        
        # Save credentials to database for Yelp API calls
        cred, created = PartnerCredential.objects.get_or_create(username=userid)
        if cred.password != password:
            cred.password = password
            cred.save()
            logger.info(f"🔐 Updated credentials for user: {userid}")
        
        # Create or get a dummy Django user (not used for actual auth)
        # This is needed because DRF expects a User object
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Try to get existing user or create a dummy one
        user, created = User.objects.get_or_create(
            username=userid,
            defaults={'is_active': True}
        )
        
        if created:
            logger.info(f"🔐 Created dummy Django user for: {userid}")
        
        logger.info(f"🔐 Authentication successful for user: {userid}")
        return (user, None)


class AllowAnyWithLogging(BasePermission):
    """
    Allow any request, but log when called.
    Used for debugging authentication issues.
    """
    
    def has_permission(self, request, view):
        logger.info(f"🔐 AllowAnyWithLogging.has_permission: user={request.user}, authenticated={request.user.is_authenticated}")
        return True
