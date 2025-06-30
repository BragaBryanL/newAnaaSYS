import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e6f0fa",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 7,
  },
  profileImage: {
    borderRadius: 15,
    backgroundColor: "#a3bffa",
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2a4d69",
    marginBottom: 6,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#457b9d",
    marginBottom: 12,
    textAlign: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#4a6785",
    marginBottom: 8,
    textAlign: "center",
  },
  statusToggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  toggleButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: "#a3bffa",
    marginHorizontal: 15,
  },
  toggleAvailable: {
    backgroundColor: "#22c55e", // green
    borderColor: "#22c55e",
  },
  toggleBusy: {
    backgroundColor: "#ef4444", // red
    borderColor: "#ef4444",
  },
  toggleOffline: {
    backgroundColor: "#6b7280", // gray
    borderColor: "#6b7280",
  },

  bellContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#e6f0fa",
  },
  notificationPanel: {
    position: "absolute",
    top: 45,
    left: -10,
    width: 260,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000,
  },
  notificationText: {
    color: "#222",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default styles;
