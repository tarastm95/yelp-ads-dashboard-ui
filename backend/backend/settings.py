from pathlib import Path
import environ

env = environ.Env()
environ.Env.read_env('.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = env('SECRET_KEY', default='dummy-secret-key')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = ['*']
LOG_LEVEL = env('LOG_LEVEL', default=('DEBUG' if DEBUG else 'INFO'))
YELP_API_KEY = env('YELP_API_KEY')
YELP_API_SECRET = env('YELP_API_SECRET')
YELP_FUSION_TOKEN = env('YELP_FUSION_TOKEN')
YELP_FUSION_API_KEY = env('YELP_FUSION_API_KEY', default=env('YELP_FUSION_TOKEN', default=''))

# Redis settings (for caching and batch processing)
REDIS_HOST = env('REDIS_HOST', default='redis')
REDIS_PORT = env.int('REDIS_PORT', default=6379)
REDIS_DB = env.int('REDIS_DB', default=0)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'ads',
]

MIDDLEWARE = [
    'ads.middleware.SimpleCorsMiddleware',  # Наш простий CORS middleware
    'django.middleware.security.SecurityMiddleware',
    'ads.middleware.RequestLoggingMiddleware',  # Додаємо логування запитів
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        **env.db('DATABASE_URL'),
        'CONN_MAX_AGE': 600,  # Reuse connections for 10 minutes
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Django Cache Configuration with Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}',
        'KEY_PREFIX': 'yelp_ads',
        'TIMEOUT': 60,  # 60 seconds default TTL
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'ads.auth.StoringBasicAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Тимчасово дозволяємо всім
    ],
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': LOG_LEVEL,
        },
        'database': {
            'level': 'INFO',
            'class': 'ads.logging_handlers.DatabaseLogHandler',
        },
    },
    'loggers': {
        'ads': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'ads.views': {
            'handlers': ['console'],
            'level': 'INFO',  # Завжди INFO для детального логування views
            'propagate': False,
        },
        'ads.services': {
            'handlers': ['console'],
            'level': 'INFO',  # Завжди INFO для детального логування сервісів
            'propagate': False,
        },
        'ads.requests': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'ads.auth': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
}

# CORS налаштування тепер в ads.middleware.SimpleCorsMiddleware
