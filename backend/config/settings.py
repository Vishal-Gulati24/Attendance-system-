"""
Django settings for attendance backend.
Project root is backend/; config is the settings package.
Loads from environment (and optional .env in backend/). Use .env.example as reference.
"""
from pathlib import Path
import os

from dotenv import load_dotenv

# backend/config/settings.py -> parent = backend/config, parent.parent = backend
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# Security: keep SECRET_KEY out of code; generate a new one for production (e.g. python -c "import secrets; print(secrets.token_urlsafe(50))")
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or 'django-insecure-dev-only-change-in-production'

# Only enable DEBUG when explicitly set (e.g. DEBUG=1 in .env for local)
DEBUG = os.environ.get('DEBUG', '').lower() in ('1', 'true', 'yes')

# Comma-separated list of allowed hosts. In production set e.g. ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
_allowed = os.environ.get('ALLOWED_HOSTS', '').strip()
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()] if _allowed else ['localhost', '127.0.0.1']

# CORS: allow only your frontend origin(s). Comma-separated, e.g. CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
# Do not set CORS_ALLOW_ALL_ORIGINS in production.
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '').strip()
if _cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    # Local dev: allow all when no CORS_ALLOWED_ORIGINS set
    CORS_ALLOW_ALL_ORIGINS = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'core',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Optional: for HTTPS hosting set CSRF_TRUSTED_ORIGINS (comma-separated) e.g. https://yourapp.vercel.app
_csrf_origins = os.environ.get('CSRF_TRUSTED_ORIGINS', '').strip()
if _csrf_origins:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_origins.split(',') if o.strip()]

# Production security (when DEBUG is False)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', '1').lower() in ('1', 'true', 'yes')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
