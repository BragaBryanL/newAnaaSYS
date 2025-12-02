import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./sidebar";
import Homepage from "../pages/home";
function Layout() {
  return (
    <div className="app-container" style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "20px", marginLeft: "260px" }}>
        <Routes>
          <Route path="home" element={<Homepage />} />
          <Route path="*" element={<Navigate to="homepage" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default Layout;
