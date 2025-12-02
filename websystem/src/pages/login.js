import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { FiUser, FiLock } from "react-icons/fi";
import logo from "../anaa_syslogo.jpg";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [animateIn, setAnimateIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = (e) => {
    e.preventDefault();
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
    onLogin(); // Update auth state
    navigate("/home"); // Redirect after login
  };

  return (
    <div className="login-bg">
      <div className={`login-container ${animateIn ? "fade-in" : ""}`}>
        <div className="logo">
          <img src={logo} alt="Logo" className="logo-img" />
        </div>
        <h2 className="login-title">Welcome Back</h2>
        {error && <p className="error-msg">{error}</p>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Username or Email"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <FiUser className="input-icon" />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FiLock className="input-icon" />
          </div>
          <button type="submit" className="login-btn">
            Log In
          </button>
          <a href="#" className="forgot-link">Forgot password?</a>
          <p className="signup-text">
            Don't have an account? <a href="#" className="signup-link">Sign up</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
