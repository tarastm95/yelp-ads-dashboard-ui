from rest_framework.authentication import BasicAuthentication
from .models import PartnerCredential

class StoringBasicAuthentication(BasicAuthentication):
    """Basic auth that saves credentials for later partner API use."""

    def authenticate_credentials(self, userid, password, request=None):
        user_auth_tuple = super().authenticate_credentials(userid, password, request)
        cred, created = PartnerCredential.objects.get_or_create(username=userid)
        if cred.password != password:
            cred.password = password
            cred.save()
        return user_auth_tuple
