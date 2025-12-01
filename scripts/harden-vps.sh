#!/usr/bin/env bash
set -euo pipefail

# Harden a Debian/Ubuntu VPS quickly: updates, firewall, SSH config, basic tooling.
# Run as root or with sudo.

if [[ $EUID -ne 0 ]]; then
  echo "[!] Run as root or via sudo" >&2
  exit 1
fi

read -rp "Allow SSH port (default 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

read -rp "Allow additional TCP ports (comma-separated, blank for none): " EXTRA_TCP
read -rp "Allow additional UDP ports (comma-separated, blank for none): " EXTRA_UDP

apt update
apt install -y unattended-upgrades fail2ban ufw

apt install -y auditd needrestart logrotate rsyslog

# Configure unattended-upgrades
cat >/etc/apt/apt.conf.d/51unattended-upgrades-hardening <<'EOF'
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Basic fail2ban jail for sshd
cat >/etc/fail2ban/jail.d/sshd-hardening.conf <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban

# Configure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ${SSH_PORT}/tcp comment 'SSH'
if [[ -n "${EXTRA_TCP}" ]]; then
  IFS=',' read -ra PORTS <<<"${EXTRA_TCP}"
  for p in "${PORTS[@]}"; do
    if [[ -n "${p}" ]]; then
      ufw allow ${p}/tcp
    fi
  done
fi
if [[ -n "${EXTRA_UDP}" ]]; then
  IFS=',' read -ra PORTS <<<"${EXTRA_UDP}"
  for p in "${PORTS[@]}"; do
    if [[ -n "${p}" ]]; then
      ufw allow ${p}/udp
    fi
  done
fi
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Harden SSH (disable root login, password auth optional)
read -rp "Disable password auth for SSH? (y/N): " DISABLE_PASS
read -rp "Allow root login? (y/N): " ALLOW_ROOT

SSHD_CONFIG=/etc/ssh/sshd_config.d/99-hardening.conf
mkdir -p /etc/ssh/sshd_config.d
{
  echo "Port ${SSH_PORT}"
  if [[ "${DISABLE_PASS}" =~ ^[Yy]$ ]]; then
    echo "PasswordAuthentication no"
  fi
  if [[ "${ALLOW_ROOT}" =~ ^[Yy]$ ]]; then
    echo "PermitRootLogin prohibit-password"
  else
    echo "PermitRootLogin no"
  fi
  echo "ChallengeResponseAuthentication no"
  echo "UsePAM yes"
  echo "X11Forwarding no"
  echo "AllowAgentForwarding no"
  echo "AllowTcpForwarding no"
  echo "ClientAliveInterval 300"
  echo "ClientAliveCountMax 2"
} >"${SSHD_CONFIG}"

systemctl restart sshd

# Disable unused services
systemctl disable --now avahi-daemon || true
systemctl disable --now cups || true

# Log audit summary
systemctl enable --now auditd

echo
ufw status verbose
echo
systemctl status fail2ban --no-pager | sed -n '1,10p'
echo "[+] VPS hardening done. Remember to point your SSH client to port ${SSH_PORT}."
