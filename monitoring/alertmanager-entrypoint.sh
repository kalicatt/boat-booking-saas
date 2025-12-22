#!/bin/sh
set -e

# Substitute environment variables in alertmanager config
envsubst '${SMTP_HOST} ${SMTP_PORT} ${SMTP_USER} ${SMTP_PASS} ${ALERT_WEBHOOK_URL} ${DISCORD_WEBHOOK_URL}' \
  < /etc/alertmanager/alertmanager.yml.template \
  > /etc/alertmanager/alertmanager.yml

# Start alertmanager
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml "$@"
