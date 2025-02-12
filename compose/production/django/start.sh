#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

# Collect static
python manage.py collectstatic --noinput

# Run migrations
python manage.py makemigrations
python manage.py migrate


# Create super user and default models
python manage.py initial_superuser
python manage.py initial_sports
python manage.py token_application

/usr/local/bin/gunicorn backend.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --chdir=/backend