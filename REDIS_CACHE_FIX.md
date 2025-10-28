# Redis Cache Configuration Fix

## Issue
Backend was crashing with error:
```
TypeError: AbstractConnection.__init__() got an unexpected keyword argument 'CLIENT_CLASS'
```

## Root Cause
The `CLIENT_CLASS` option in `CACHES` configuration is specific to the `django-redis` package, but we're using Django's built-in `django.core.cache.backends.redis.RedisCache` backend.

## Solution
Removed the incompatible `OPTIONS` dictionary from the cache configuration.

### Before (Incorrect):
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',  # ❌ Not supported
        },
        'KEY_PREFIX': 'yelp_ads',
        'TIMEOUT': 60,
    }
}
```

### After (Correct):
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}',
        'KEY_PREFIX': 'yelp_ads',
        'TIMEOUT': 60,  # 60 seconds default TTL
    }
}
```

## Verification
```bash
# Test cache functionality
docker compose exec backend sh -c "DJANGO_SETTINGS_MODULE=backend.settings python -c \"from django.core.cache import cache; cache.set('test', 'value', 10); print('Cache works:', cache.get('test'))\""
```

Expected output:
```
Cache works: value
```

## Status
✅ Fixed and verified
✅ Backend restarted successfully
✅ Cache is working correctly

## Date
October 20, 2025

