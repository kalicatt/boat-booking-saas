#!/bin/sh
set -e

# Substitute environment variables in alertmanager config using sed
sed -e "s|\${SMTP_HOST}|${SMTP_HOST}|g" \
    -e "s|\${SMTP_PORT}|${SMTP_PORT}|g" \
    -e "s|\${SMTP_USER}|${SMTP_USER}|g" \
    -e "s|\${SMTP_PASS}|${SMTP_PASS}|g" \
    -e "s|\${ALERT_WEBHOOK_URL}|${ALERT_WEBHOOK_URL}|g" \
    -e "s|\${DISCORD_WEBHOOK_URL}|${DISCORD_WEBHOOK_URL}|g" \
    /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml

# Start alertmanager
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml "$@"
