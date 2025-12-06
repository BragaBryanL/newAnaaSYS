# Raspberry Pi UHF Reader - Autostart Setup Guide

## Automatic Startup Without Monitor

This guide helps you run the UHF RFID reader automatically on your Raspberry Pi on boot, without needing a monitor or keyboard.

---

## Quick Setup (Recommended)

### Step 1: Copy Files to Raspberry Pi

```bash
# On your Raspberry Pi, create the directory
ssh pi@YOUR_PI_IP
mkdir -p /home/pi/anaa
```

Copy these files:
- `uhf_reader.py` → `/home/pi/anaa/uhf_reader.py`
- `raspi-autostart-setup.sh` → `/home/pi/anaa/raspi-autostart-setup.sh`

### Step 2: Update IP Address

Edit `uhf_reader.py` and change the API URL to your Windows machine's IP:
```python
API_BASE_URL = "http://192.168.0.104:5000"  # Your Windows IP
```

### Step 3: Run Setup Script

```bash
cd /home/pi/anaa
chmod +x raspi-autostart-setup.sh
bash raspi-autostart-setup.sh
```

### Step 4: Reboot

```bash
sudo reboot
```

✅ **Done!** The UHF reader will now start automatically every time you power on the Pi.

---

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-serial
pip3 install pyserial requests --break-system-packages
```

### 2. Create Systemd Service

```bash
sudo nano /etc/systemd/system/uhf-reader.service
```

Paste this content:

```ini
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
```

Save and exit (`Ctrl+X`, `Y`, `Enter`)

### 3. Enable Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable uhf-reader.service
sudo systemctl start uhf-reader.service
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `sudo systemctl status uhf-reader` | Check if service is running |
| `tail -f /home/pi/anaa/uhf_reader.log` | View live logs |
| `sudo systemctl restart uhf-reader` | Restart the service |
| `sudo systemctl stop uhf-reader` | Stop the service |
| `sudo systemctl disable uhf-reader` | Disable autostart |

---

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u uhf-reader -n 50 --no-pager

# Check if Python script has errors
python3 /home/pi/anaa/uhf_reader.py
```

### Serial port permission denied
```bash
sudo usermod -a -G dialout pi
sudo reboot
```

### Network not available on boot
The service waits 10 seconds after boot (`ExecStartPre=/bin/sleep 10`) to allow network initialization. If your network takes longer, increase this:
```bash
sudo nano /etc/systemd/system/uhf-reader.service
# Change: ExecStartPre=/bin/sleep 30
sudo systemctl daemon-reload
sudo systemctl restart uhf-reader
```

### Can't reach Windows backend
1. Check Windows IP is correct in `uhf_reader.py`
2. Verify Windows Firewall allows port 5000
3. Test connection from Pi:
   ```bash
   curl http://192.168.0.104:5000/
   ```

---

## Verifying Setup

After reboot, check if it's running:

```bash
# Check service status
sudo systemctl status uhf-reader

# View recent logs
tail -20 /home/pi/anaa/uhf_reader.log

# Test RFID scan (scan a card and check logs)
tail -f /home/pi/anaa/uhf_reader.log
```

You should see:
```
[INFO] Serial port /dev/ttyACM0 opened successfully
[INFO] Baud rate: 115200
[INFO] Connected to backend: http://192.168.0.104:5000
[INFO] Waiting for RFID scans...
```

---

## Headless Operation

Once configured, you can:
1. **Unplug monitor and keyboard** - not needed anymore
2. **Power on the Pi** - service starts automatically
3. **View logs remotely** via SSH:
   ```bash
   ssh pi@YOUR_PI_IP
   tail -f /home/pi/anaa/uhf_reader.log
   ```

---

## Network Configuration

### Static IP (Recommended for Production)

Edit network config:
```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface eth0
static ip_address=192.168.0.200/24
static routers=192.168.0.1
static domain_name_servers=8.8.8.8
```

Or for WiFi:
```
interface wlan0
static ip_address=192.168.0.200/24
static routers=192.168.0.1
static domain_name_servers=8.8.8.8
```

Reboot: `sudo reboot`

---

## LED Status Indicator (Optional)

Want to know if the reader is running without SSH? Add an LED to GPIO pin 17:

Add this to the top of `uhf_reader.py`:
```python
import RPi.GPIO as GPIO

LED_PIN = 17
GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.output(LED_PIN, GPIO.HIGH)  # Turn on LED when running
```

And in the `finally` block of `main()`:
```python
GPIO.output(LED_PIN, GPIO.LOW)  # Turn off LED on exit
GPIO.cleanup()
```

---

## Production Checklist

- [ ] Static IP configured on Raspberry Pi
- [ ] Windows Firewall allows port 5000
- [ ] Backend server auto-starts on Windows (see Windows Task Scheduler)
- [ ] UHF reader service enabled and tested
- [ ] Logs verified after reboot
- [ ] Test RFID scan end-to-end
- [ ] Document Pi IP and credentials
- [ ] Label Pi with IP address sticker

---

## Uninstall

To remove autostart:
```bash
sudo systemctl stop uhf-reader
sudo systemctl disable uhf-reader
sudo rm /etc/systemd/system/uhf-reader.service
sudo systemctl daemon-reload
```
