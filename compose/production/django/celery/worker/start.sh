#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

watchfiles \
  --filter python \
  'celery -A backend --loglevel=info -Q high_priority,default' \