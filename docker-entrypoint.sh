#!/bin/sh
set -e

# Anonymous/named volumes for .next (and sometimes node_modules) are created
# as root. Ensure the runtime user can write Turbopack / Next caches.
mkdir -p /app/.next
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/.next
  if [ -d /app/node_modules ]; then
    chown -R node:node /app/node_modules
  fi
  exec su-exec node "$@"
fi

exec "$@"
