#!/bin/bash

set -o errexit
set -o nounset

worker_ready() {
    celery -A django_celery_example inspect ping
}

until worker_ready; do
  >&2 echo 'Celery workers not available'
  sleep 1
done
>&2 echo 'Celery workers is available'

exec celery -A django_celery_example \
    --broker="${CELERY_BROKER}" \
    flower \
    --basic_auth="${CELERY_FLOWER_USER}:${CELERY_FLOWER_PASSWORD}"