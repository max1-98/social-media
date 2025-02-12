#!/bin/bash

set -o errexit
set -o nounset

watchfiles \
  --filter python \
  'celery -A backend worker --loglevel=info -Q low_priority' \