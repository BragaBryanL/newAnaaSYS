"""
UHF RFID Reader for ANAA System
Reads RFID tags and communicates with backend API
Supports both registered and unregistered RFID tags
"""

import time
import serial
import requests
import sys
import re
from urllib.parse import quote_plus
from datetime import datetime

# ----------------------------
# Backend API Configuration
# ----------------------------
API_BASE_URL = "http://192.168.0.104:5000"

# API Endpoints
ENDPOINT_CHECK_RFID = f"{API_BASE_URL}/faculty/rfid"
ENDPOINT_RFID_SCAN = f"{API_BASE_URL}/rfid/scan"
ENDPOINT_UPDATE_STATUS = f"{API_BASE_URL}/faculty"

# ----------------------------
# Serial Port Configuration
# ----------------------------
SERIAL_PORT = "/dev/ttyACM0"  # Raspberry Pi default
BAUD_RATE = 115200
REQUEST_TIMEOUT = 5  # seconds

# ----------------------------
# Initialize Serial Connection
# ----------------------------
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"[INFO] Serial port {SERIAL_PORT} opened successfully")
    print(f"[INFO] Baud rate: {BAUD_RATE}")
    print(f"[INFO] Connected to backend: {API_BASE_URL}\n")
except Exception as e:
    print(f"[ERROR] Could not open serial port {SERIAL_PORT}: {e}")
    sys.exit(1)


def log_message(level, message):
    """Print formatted log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")


def sanitize_tag(raw):
    """
    Clean and normalize RFID tag
    Removes whitespace and non-alphanumeric characters
    Converts to uppercase for consistency
    """
    if raw is None:
        return ""
    s = raw.strip().upper()
    # Keep only alphanumeric characters
    return re.sub(r'[^0-9A-Z]', '', s)


def post_unregistered(tag):
    """
    Send unregistered RFID tag to backend
    Creates notification for unregistered scan
    """
    payload = {
        "tag": tag,
        "type": "not_registered",
        "message": f"Unregistered RFID: {tag}"
    }
    
    try:
        log_message("INFO", f"Posting unregistered tag: {tag}")
        response = requests.post(
            ENDPOINT_RFID_SCAN,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.ok:
            log_message("SUCCESS", f"Unregistered tag recorded: {tag}")
        else:
            log_message("ERROR", f"Failed to record unregistered tag {tag}: {response.status_code}")
            
    except requests.exceptions.Timeout:
        log_message("ERROR", f"Timeout posting unregistered tag: {tag}")
    except requests.exceptions.ConnectionError:
        log_message("ERROR", f"Connection error - Cannot reach backend")
    except Exception as e:
        log_message("ERROR", f"Network error posting unregistered tag {tag}: {e}")


def record_registered_scan(faculty_id, tag, faculty_info):
    """
    Record registered RFID scan in rfid_logs table
    """
    payload = {
        "faculty_id": faculty_id,
        "tag": tag,
        "type": "uhf_scan"
    }
    
    try:
        response = requests.post(
            ENDPOINT_RFID_SCAN,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.ok:
            log_message("SUCCESS", f"Scan logged for faculty_id={faculty_id}")
        else:
            log_message("WARN", f"Failed to log scan: {response.status_code}")
            
    except Exception as e:
        log_message("WARN", f"Error recording scan: {e}")


def set_status_active(faculty_id, faculty_info):
    """
    Update faculty status to Active
    """
    try:
        response = requests.patch(
            f"{ENDPOINT_UPDATE_STATUS}/{faculty_id}/status",
            json={"status": "Active"},
            timeout=REQUEST_TIMEOUT
        )
        
        if response.ok:
            log_message("SUCCESS", 
                f"Status updated to Active: {faculty_info['first_name']} {faculty_info['last_name']} (ID: {faculty_id})")
        else:
            log_message("ERROR", f"Status update failed for ID={faculty_id}: {response.status_code}")
            
    except Exception as e:
        log_message("ERROR", f"Error updating status for ID={faculty_id}: {e}")


def process_rfid(tag_id):
    """
    Main RFID processing function
    1. Sanitize tag
    2. Check if registered in database
    3. If registered: update status and log scan
    4. If not registered: record as unregistered
    """
    tag = sanitize_tag(tag_id)
    
    if not tag:
        log_message("WARN", f"Empty/invalid tag after sanitization: {repr(tag_id)}")
        return
    
    log_message("INFO", f"Processing RFID tag: {tag}")
    
    try:
        # Check if RFID is registered
        response = requests.get(
            f"{ENDPOINT_CHECK_RFID}/{quote_plus(tag)}",
            timeout=REQUEST_TIMEOUT
        )
        
    except requests.exceptions.Timeout:
        log_message("ERROR", f"Timeout checking tag: {tag}")
        return
    except requests.exceptions.ConnectionError:
        log_message("ERROR", "Cannot connect to backend server")
        return
    except Exception as e:
        log_message("ERROR", f"Network error checking tag {tag}: {e}")
        return
    
    # Handle response
    if response.status_code == 404:
        # RFID not registered
        log_message("WARN", f"RFID not registered: {tag}")
        post_unregistered(tag)
        return
    
    if response.status_code != 200:
        log_message("ERROR", f"Backend error {response.status_code} for tag {tag}")
        return
    
    # RFID is registered - process faculty data
    try:
        data = response.json()
        faculty = data.get("faculty", data)
        
        faculty_id = faculty.get("id") or faculty.get("faculty_id")
        faculty_info = {
            "first_name": faculty.get("first_name", ""),
            "last_name": faculty.get("last_name", ""),
            "department": faculty.get("department", ""),
            "email": faculty.get("email", ""),
            "rfid": tag
        }
        
        log_message("INFO", 
            f"✓ REGISTERED: {faculty_info['first_name']} {faculty_info['last_name']} "
            f"({faculty_info['department']}) - ID: {faculty_id}")
        
        if faculty_id:
            # Update status to Active
            set_status_active(faculty_id, faculty_info)
            
            # Record the scan
            record_registered_scan(faculty_id, tag, faculty_info)
        else:
            log_message("ERROR", "Faculty ID not found in response")
            
    except Exception as e:
        log_message("ERROR", f"Error parsing faculty data for tag {tag}: {e}")


# ----------------------------
# Main Loop
# ----------------------------
def main():
    """
    Main loop: continuously read RFID tags from UHF reader
    """
    log_message("INFO", "=" * 60)
    log_message("INFO", "ANAA System - UHF RFID Reader Started")
    log_message("INFO", "=" * 60)
    log_message("INFO", "Waiting for RFID scans...")
    log_message("INFO", "Press Ctrl+C to stop\n")
    
    scan_count = 0
    
    try:
        while True:
            try:
                # Read line from serial port
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                
            except Exception as e:
                log_message("ERROR", f"Serial read error: {e}")
                time.sleep(0.5)
                continue
            
            # Process if data received
            if line:
                scan_count += 1
                log_message("SCAN", f"Tag #{scan_count} detected: {line}")
                process_rfid(line)
                print("-" * 60 + "\n")
            
            # Small delay to prevent CPU overuse
            time.sleep(0.1)
    
    except KeyboardInterrupt:
        log_message("INFO", "\nStopping UHF reader...")
        log_message("INFO", f"Total scans processed: {scan_count}")
    
    finally:
        try:
            ser.close()
            log_message("INFO", "Serial port closed")
        except Exception:
            pass


if __name__ == "__main__":
    main()