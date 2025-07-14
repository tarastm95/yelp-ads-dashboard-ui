from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _ensure_default_user(sender=None, **kwargs):
    """Create a Django user based on Yelp API credentials if missing."""
    from django.conf import settings
    from django.contrib.auth import get_user_model

    username = getattr(settings, "YELP_API_KEY", None)
    password = getattr(settings, "YELP_API_SECRET", None)

    if not username or not password:
        return

    User = get_user_model()
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(username=username, password=password)

class AdsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ads'

    def ready(self):
        post_migrate.connect(_ensure_default_user, sender=self)
