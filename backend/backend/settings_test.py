"""Test settings — uses SQLite so tests can run without MySQL."""
import os

# Set required env vars with safe defaults for testing
os.environ.setdefault('DJANGO_SECRET_KEY', 'test-secret-key-not-for-production')
os.environ.setdefault('DJANGO_DEBUG', 'true')
os.environ.setdefault('DJANGO_ALLOWED_HOSTS', 'localhost')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('DB_USER', 'root')
os.environ.setdefault('DB_PASSWORD', '')
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_PORT', '3306')
os.environ.setdefault('DJANGO_ADMIN_PASSWORD', 'test-admin-pw')
os.environ.setdefault('OAUTH_CLIENT_ID', 'test-client-id')
os.environ.setdefault('OAUTH_CLIENT_SECRET', 'test-client-secret')

from backend.settings import *  # noqa: F401,F403

# Override database to SQLite for tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Faster password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
