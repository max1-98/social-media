#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset


# Run migrations
python manage.py makemigrations
python manage.py migrate


# Create super user and default models
python manage.py initial_superuser
python manage.py initial_sports
python manage.py token_application

# Run the server
python manage.py runserver 0.0.0.0:8000
