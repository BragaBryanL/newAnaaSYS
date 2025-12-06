#!/bin/bash
# =======================================================
# Raspberry Pi UHF Reader Autostart Setup Script
# =======================================================
# This script sets up the UHF reader to run automatically
# on boot without needing a monitor or keyboard.
#
# USAGE:
# 1. Copy uhf_reader.py to /home/pi/anaa/uhf_reader.py on your Raspberry Pi
# 2. Run this script: bash raspi-autostart-setup.sh
# 3. Reboot your Pi: sudo reboot
#
# The UHF reader will start automatically and logs will be in:
# /home/pi/anaa/uhf_reader.log
# =======================================================

echo "=========================================="
echo "ANAA System - Raspberry Pi Autostart Setup"
echo "=========================================="

# Create project directory
echo "[1/5] Creating project directory..."
mkdir -p /home/pi/anaa
cd /home/pi/anaa

# Install Python dependencies
echo "[2/5] Installing Python dependencies..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-serial
pip3 install pyserial requests --break-system-packages

# Create systemd service file
echo "[3/5] Creating systemd service..."
sudo tee /etc/systemd/system/uhf-reader.service > /dev/null <<EOF
[Unit]
Description=ANAA UHF RFID Reader Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/anaa
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/python3 /home/pi/anaa/uhf_reader.py
Restart=always
RestartSec=10
StandardOutput=append:/home/pi/anaa/uhf_reader.log
StandardError=append:/home/pi/anaa/uhf_reader.log

[Install]
WantedBy=multi-user.target
EOF

# Set correct permissions
echo "[4/5] Setting permissions..."
sudo chmod 644 /etc/systemd/system/uhf-reader.service
sudo chown pi:pi /home/pi/anaa

# Enable and start service
echo "[5/5] Enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable uhf-reader.service

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy uhf_reader.py to /home/pi/anaa/"
echo "2. Update API_BASE_URL in uhf_reader.py with your Windows IP"
echo "3. Reboot: sudo reboot"
echo ""
echo "Useful commands:"
echo "  View logs:        tail -f /home/pi/anaa/uhf_reader.log"
echo "  Check status:     sudo systemctl status uhf-reader"
echo "  Stop service:     sudo systemctl stop uhf-reader"
echo "  Start service:    sudo systemctl start uhf-reader"
echo "  Restart service:  sudo systemctl restart uhf-reader"
echo "  Disable autostart: sudo systemctl disable uhf-reader"
echo ""
