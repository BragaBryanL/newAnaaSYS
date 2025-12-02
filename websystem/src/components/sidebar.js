import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUserPlus,
  FiLayers,
  FiUsers,
  FiFileText,
  FiMenu,
  FiX,
} from "react-icons/fi";
import "./sidebar.css";

function Sidebar() {
  // Sidebar open state: open by default on desktop (>768px), closed on mobile
  const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

  // Handle window resize to auto-open or auto-close sidebar
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setIsOpen(true);
        document.body.style.overflow = ""; // allow scroll on desktop
      } else {
        setIsOpen(false);
        document.body.style.overflow = ""; // reset scroll
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) {
      document.body.style.overflow = isOpen ? "hidden" : "";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Toggle sidebar open/close
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <h2 className="sidebar-title">ANAA System</h2>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/home" className={({ isActive }) => (isActive ? "active" : "")} end>
              <FiHome className="icon" />
              Homepage
            </NavLink>
          </li>
          <li>
            <NavLink to="/registration" className={({ isActive }) => (isActive ? "active" : "")}>
              <FiUserPlus className="icon" />
              Registration
            </NavLink>
          </li>
          <li>
            <NavLink to="/department" className={({ isActive }) => (isActive ? "active" : "")}>
              <FiLayers className="icon" />
              Department
            </NavLink>
          </li>
          <li>
            <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>
              <FiUsers className="icon" />
              Users
            </NavLink>
          </li>
          <li>
            <NavLink to="/consultation" className={({ isActive }) => (isActive ? "active" : "")}>
              <FiFileText className="icon" />
              Consultation
            </NavLink>
          </li>
        </ul>
      </div>

      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
    </>
  );
}

export default Sidebar;
