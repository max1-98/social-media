#!/bin/bash

# if any of the commands in your code fails for any reason, the entire script fails
set -o errexit
# fail exit if one of your pipe command fails
set -o pipefail
# exits if any of your variables is not set
set -o nounset

mysql_ready() {
python << END
import sys
import mysql.connector

try:
    mydb = mysql.connector.connect(
        host="${SQL_HOST}",
        user="${SQL_USER}",
        password="${SQL_PASSWORD}",
        database="${SQL_DATABASE}",
        port="${SQL_PORT}"
    )
    mydb.close() #close the connection after successful connection
except mysql.connector.Error as err:
    sys.stderr.write(f"MySQL connection error: {err}\n") # improved error reporting
    sys.exit(-1)
sys.exit(0)

END
}

until mysql_ready; do
  >&2 echo 'Waiting for MySQL to become available...'
  sleep 1
done
>&2 echo 'MySQL is available'

exec "$@"