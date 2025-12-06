import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Vibration,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/HomeScreenStyles";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Home: { faculty: any };
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Static IP here
const API_URL = "http://192.168.0.103:5000";

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const faculty = route?.params?.faculty;
  const [status, setStatus] = useState(
    faculty?.status
      ? faculty.status.toLowerCase() === "active"
        ? "available"
        : faculty.status.toLowerCase()
      : "offline"
  );
  const [rfidScanStatus, setRfidScanStatus] = useState<{
    canChangeStatus: boolean;
    lastScan: string | null;
    hoursAgo: string | null;
    message: string;
  } | null>(null);
  const { width } = Dimensions.get("window");
  const containerWidth = Math.min(320, width - 40);

  // Timer ref to keep track of inactivity
  const inactivityTimer = useRef<number | null>(null);

  // Function to trigger vibration and alert
  const triggerReminder = () => {
    Vibration.vibrate(5000);
    Alert.alert(
      "Status Reminder",
      "You have not updated your availability status for 2 hours. Please update it now.",
      [{ text: "OK" }]
    );
  };

  // Reset inactivity timer whenever status changes or app comes to foreground
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    // 5 seconds for testing (change to 7200000 for 2 hours in production)
    inactivityTimer.current = setTimeout(triggerReminder, 5000) as unknown as number;
  }, []);

  // Set/reset timer on mount, status change, or app comes to foreground
  useEffect(() => {
    resetInactivityTimer();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        resetInactivityTimer();
      }
    });
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      subscription.remove();
    };
  }, [status, resetInactivityTimer]);

  // Check RFID scan status on mount and every 5 minutes
  useEffect(() => {
    if (!faculty) return;
    
    const checkRfidScan = async () => {
      try {
        const res = await fetch(`${API_URL}/faculty/${faculty.id}/rfid-scan-status`);
        const data = await res.json();
        setRfidScanStatus(data);
      } catch (err) {
        console.error("Failed to check RFID scan status", err);
      }
    };
    
    checkRfidScan(); // Check immediately
    const interval = setInterval(checkRfidScan, 5000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [faculty]);

  // Poll backend for latest status every 5 seconds
  useEffect(() => {
    if (!faculty) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/faculty`);
        const data = await res.json();
        const me = data.find((f: any) => f.id === faculty.id);
        if (me && me.status) {
          const mapped =
            me.status.toLowerCase() === "active"
              ? "available"
              : me.status.toLowerCase();
          setStatus(mapped);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        // Optionally handle error
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [faculty]);



  // Update status in backend and UI
  const updateStatus = async (newStatus: string) => {
    let backendStatus = "";
    if (newStatus === "available") backendStatus = "Active";
    else if (newStatus === "busy") backendStatus = "Busy";
    else backendStatus = "Offline";

    try {
      // First, check if RFID scan is valid (within 10 seconds)
      const checkResponse = await fetch(`${API_URL}/faculty/${faculty.id}/rfid-scan-status`);
      const checkData = await checkResponse.json();
      
      if (!checkData.canChangeStatus) {
        Vibration.vibrate(5000); // 5 second vibration
        Alert.alert(
          "RFID Scan Required",
          checkData.message || "Please scan your RFID card before changing status.",
          [{ text: "OK" }]
        );
        return;
      }

      // If RFID is valid, proceed with status update
      const response = await fetch(`${API_URL}/faculty/${faculty.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        Vibration.vibrate(5000); // 5 second vibration
        Alert.alert(
          "Cannot Change Status",
          data.message || "Please scan your RFID card first.",
          [{ text: "OK" }]
        );
        return;
      }

      setStatus(newStatus);
      resetInactivityTimer(); // Reset timer on manual status change
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      Vibration.vibrate(5000); // 5 second vibration on error
      Alert.alert("Error", "Failed to update status. Please try again.");
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await AsyncStorage.removeItem("faculty");
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  if (!faculty) {
    return (
      <View style={styles.screen}>
        <Text>No faculty data.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.profileContainer, { width: containerWidth }]}>
          <Image
            source={{
              uri:
                faculty.photo ||
                "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(
                    faculty.first_name +
                      " " +
                      (faculty.middle_initial ? faculty.middle_initial + ". " : "") +
                      faculty.last_name
                  ),
            }}
            style={[
              styles.profileImage,
              { width: containerWidth * 0.3, height: containerWidth * 0.3 },
            ]}
            resizeMode="cover"
          />

          <Text style={styles.name}>
            {faculty.first_name}{" "}
            {faculty.middle_initial && faculty.middle_initial + ". "}
            {faculty.last_name}
          </Text>
          <Text style={styles.title}>
            {Array.isArray(faculty.titles)
              ? faculty.titles.join(", ")
              : faculty.titles || ""}
          </Text>

          <Text style={styles.infoText}>RFID: {faculty.rfid}</Text>
          <Text style={styles.infoText}>{faculty.department}</Text>

          {/* RFID Scan Status Indicator */}
          {rfidScanStatus && (
            <View
              style={[
                styles.rfidStatusContainer,
                rfidScanStatus.canChangeStatus
                  ? styles.rfidStatusValid
                  : styles.rfidStatusInvalid,
              ]}
            >
              <Text
                style={[
                  styles.rfidStatusText,
                  rfidScanStatus.canChangeStatus
                    ? styles.rfidStatusTextValid
                    : styles.rfidStatusTextInvalid,
                ]}
              >
                {rfidScanStatus.canChangeStatus ? "✓ " : "⚠ "}
                {rfidScanStatus.message}
              </Text>
              {rfidScanStatus.lastScan && (
                <Text
                  style={[
                    styles.rfidLastScanText,
                    rfidScanStatus.canChangeStatus
                      ? styles.rfidStatusTextValid
                      : styles.rfidStatusTextInvalid,
                  ]}
                >
                  Last scan: {rfidScanStatus.hoursAgo} hours ago
                </Text>
              )}
            </View>
          )}

          <View style={styles.statusToggleRow}>
            <View style={styles.statusButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  status === "available" && styles.toggleAvailable,
                ]}
                onPress={() => updateStatus("available")}
                accessibilityLabel="Set status Available"
              />
              <Text style={styles.statusLabel}>Available</Text>
            </View>
            <View style={styles.statusButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  status === "busy" && styles.toggleBusy,
                ]}
                onPress={() => updateStatus("busy")}
                accessibilityLabel="Set status Busy"
              />
              <Text style={styles.statusLabel}>Busy</Text>
            </View>
            <View style={styles.statusButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  status === "offline" && styles.toggleOffline,
                ]}
                onPress={() => updateStatus("offline")}
                accessibilityLabel="Set status Offline"
              />
              <Text style={styles.statusLabel}>Offline</Text>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 30 }}>
            <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 16 }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
    </View>
  );
}