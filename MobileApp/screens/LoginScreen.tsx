import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";

import logo from "../assets/anaa_syslogo.jpg";
import styles from "../styles/LoginScreenStyles";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  Login: undefined;
  Home: { faculty: any };
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

// ✅ Use your static IP here
const API_URL = "http://192.168.0.104:5000";

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }
    if (username.includes("@") && !validateEmail(username)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }
      // Navigate to Home with faculty info
      navigation.navigate("Home", { faculty: data.faculty });
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Animated.View
        style={[
          styles.innerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoPillContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Username or Email"
          placeholderTextColor="rgba(0, 0, 139, 0.4)"
          value={username}
          onChangeText={setUsername}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(0, 0, 139, 0.4)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: "100%" }}>
          <Pressable
            onPress={handleSubmit}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Log In</Text>
          </Pressable>
        </Animated.View>

        <TouchableOpacity onPress={() => alert("Forgot password?")}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Text style={styles.signupText}>
          Don&apos;t have an account?{" "}
          <Text
            style={styles.signupLink}
            onPress={() => alert("Navigate to Sign Up")}
          >
            Sign up
          </Text>
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}