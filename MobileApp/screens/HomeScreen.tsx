import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
  Vibration,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import styles from "../styles/HomeScreenStyles";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Home: { faculty: any };
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ✅ Use your static IP here
const API_URL = "http://192.168.0.104:5000";

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const faculty = route?.params?.faculty;
  const [status, setStatus] = useState(
    faculty?.status
      ? faculty.status.toLowerCase() === "active"
        ? "available"
        : faculty.status.toLowerCase()
      : "offline"
  );
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
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
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(triggerReminder, 7200000); // adjust to 2 hours in production
  };

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
  }, [status]);

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
      } catch (err) {
        // Optionally handle error
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [faculty]);

  const toggleNotifications = () => {
    setShowNotificationsPanel(!showNotificationsPanel);
    if (hasNotifications) {
      setHasNotifications(false);
    }
  };

  const closeNotificationsPanel = () => {
    if (showNotificationsPanel) setShowNotificationsPanel(false);
  };

  // Update status in backend and UI
  const updateStatus = async (newStatus: string) => {
    let backendStatus = "";
    if (newStatus === "available") backendStatus = "Active";
    else if (newStatus === "busy") backendStatus = "Busy";
    else backendStatus = "Offline";

    try {
      await fetch(`${API_URL}/faculty/${faculty.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus }),
      });
      setStatus(newStatus);
      resetInactivityTimer(); // Reset timer on manual status change
    } catch (err) {
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
    <TouchableWithoutFeedback onPress={closeNotificationsPanel}>
      <View style={styles.screen}>
        <View style={styles.bellContainer}>
          <TouchableOpacity onPress={toggleNotifications} activeOpacity={0.7}>
            <Feather name="bell" size={36} color="#457b9d" />
            {hasNotifications && <View style={styles.notificationBadge} />}
          </TouchableOpacity>

          {showNotificationsPanel && (
            <View style={styles.notificationPanel}>
              <Text style={styles.notificationText}>
                Student John Doe (4th Year) opened a consultation form.
              </Text>
            </View>
          )}
        </View>

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

          <View style={styles.statusToggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                status === "available" && styles.toggleAvailable,
              ]}
              onPress={() => updateStatus("available")}
              accessibilityLabel="Set status Available"
            />
            <TouchableOpacity
              style={[
                styles.toggleButton,
                status === "busy" && styles.toggleBusy,
              ]}
              onPress={() => updateStatus("busy")}
              accessibilityLabel="Set status Busy"
            />
            <TouchableOpacity
              style={[
                styles.toggleButton,
                status === "offline" && styles.toggleOffline,
              ]}
              onPress={() => updateStatus("offline")}
              accessibilityLabel="Set status Offline"
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 30 }}>
            <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 16 }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}