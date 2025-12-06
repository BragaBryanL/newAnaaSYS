import React, { useState, useEffect } from "react";
import "./studentweb.css";
import logo from "../anaa_syslogo.jpg";

function StudentWeb() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Set API URL from environment variable (build time)
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  // Debug: log the API URL being used
  useEffect(() => {
    console.log("Using API URL:", apiUrl);
  }, [apiUrl]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch faculty data from backend
  useEffect(() => {
    fetchFaculty();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchFaculty, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${apiUrl}/faculty`);
      const data = await response.json();
      setFaculty(data);
      // Extract unique departments
      const depts = ["All", ...new Set(data.map(f => f.department).filter(Boolean))];
      setDepartments(depts);
    } catch (error) {
      console.error("Error fetching faculty:", error);
    }
  };

  // Filter faculty by department
  const filteredFaculty = faculty.filter(f => {
    return selectedDept === "All" || f.department === selectedDept;
  });

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === "active") return "active";
    if (s === "busy") return "busy";
    return "offline";
  };

  const formatDateTime = (date) => {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    return `${dateStr} | ${timeStr}`;
  };

  return (
    <div className="student-view">
      <header>
        <img src={logo} alt="ANA System Logo" />
        <div className="titles">
          <h1 className="main-title">Availability Notification System</h1>
          <p className="subtitle">Instructor Availability Status</p>
          <div className="current-time">{formatDateTime(currentTime)}</div>
        </div>
      </header>

      <div className="filter-wrapper">
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="dept-filter"
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>
              {dept === "All" ? "All Departments" : dept}
            </option>
          ))}
        </select>
      </div>

      <main>
        <div className="dashboard">
          {filteredFaculty.length === 0 ? (
            <div className="no-results">No faculty members found</div>
          ) : (
            filteredFaculty.map(f => (
              <div key={f.id} className="card">
                <img
                  src={f.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.first_name + ' ' + f.last_name)}&background=4a90e2&color=fff&size=150`}
                  alt={`${f.first_name} ${f.last_name}`}
                  className="profile-pic"
                />
                <div className="name">
                  {f.first_name} {f.middle_initial ? f.middle_initial + ". " : ""}{f.last_name}
                </div>
                {f.titles && (
                  <div className="title">
                    {Array.isArray(f.titles) ? f.titles.join("\n") : f.titles}
                  </div>
                )}
                <div className="department">{f.department}</div>
                <div className="status">
                  <div className={`status-dot ${getStatusClass(f.status)}`}></div>
                  <span>{f.status || "Offline"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentWeb;
