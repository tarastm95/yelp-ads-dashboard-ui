from pathlib import Path
import environ

env = environ.Env()
environ.Env.read_env('.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = env('SECRET_KEY', default='dummy-secret-key')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = ['*']
LOG_LEVEL = env('LOG_LEVEL', default=('DEBUG' if DEBUG else 'INFO'))
YELP_API_KEY = env('YELP_API_KEY', default='KTqXwkcW5t4EwUN-8SusEfrSfctwVDIJ65FXXR3T72xYS-ZEuKORWvtvT1OQ8zBIcCXsP7nyrcXFuL_93988JoPpezu1Or4mE25_tSA8zVKji_4NI6_EbHJMbOYRZHYx')
YELP_API_SECRET = env('YELP_API_SECRET', default='obKNrCDl4i7Pgt8tjNmWA7Nq162QqPc2RvNqjS3BaGRBSRdkhO4rrR32o50UxYKq')
YELP_FUSION_TOKEN = env('YELP_FUSION_TOKEN', default='your_token')

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
    'django.middleware.security.SecurityMiddleware',
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
    'default': env.db('DATABASE_URL')
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
        'rest_framework.permissions.IsAuthenticated',
    ],
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': LOG_LEVEL,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
}
