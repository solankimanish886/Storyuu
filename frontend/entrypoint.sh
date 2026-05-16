#!/bin/sh
set -e
# Default backend URL — override via BACKEND_URL env var in your deployment platform
: "${BACKEND_URL:=http://backend:4000}"
# Substitute only $BACKEND_URL — leaves nginx variables ($host, $uri, etc.) untouched
envsubst '$BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec "$@"
