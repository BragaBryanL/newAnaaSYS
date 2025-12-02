import React, { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import "./users.css";

const departments = ["All", "IT", "DS", "CS", "TCM"];
const statusColors = {
  Active: "#2ecc71",
  Busy: "#e74c3c",
  Offline: "#95a5a6",
};

function Users() {
  const [users, setUsers] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");

  useEffect(() => {
    fetch("http://localhost:5000/faculty")
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const setStatus = (id, newStatus) => {
    fetch(`http://localhost:5000/faculty/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then(() => {
        // Refresh users after status update
        fetch("http://localhost:5000/faculty")
          .then((res) => res.json())
          .then((data) => setUsers(Array.isArray(data) ? data : []))
          .catch(() => setUsers([]));
      });
  };

  const filteredUsers =
    selectedDept === "All"
      ? users
      : users.filter((user) => user.department === selectedDept);

  return (
    <div className="users-wrapper">
      <Sidebar className="sidebar" />
      <main className="users-content">
        <h2>Faculty Users</h2>
        <div className="filter-container">
          <label htmlFor="deptFilter" className="filter-label">
            Filter by Department:
          </label>
          <select
            id="deptFilter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="dept-filter"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "All" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>

        <div className="users-grid">
          {filteredUsers.length === 0 ? (
            <p className="no-users-msg">No faculty found in this department.</p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="user-card">
                {user.photo ? (
                  <img src={user.photo} alt={user.first_name} className="profile-photo" />
                ) : (
                  <div className="profile-photo-placeholder">
                    {user.first_name ? user.first_name.charAt(0) : "?"}
                  </div>
                )}
                <div className="user-info">
                  <strong>
                    {user.first_name} {user.middle_initial} {user.last_name}
                  </strong>
                  <div className="titles">{user.titles && user.titles.join(", ")}</div>
                  <div className="department-label">{user.department}</div>
                </div>
                <div className="status-selector">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <button
                      key={status}
                      className="status-circle"
                      style={{
                        backgroundColor: color,
                        border: user.status === status ? "3px solid #333" : "none",
                      }}
                      title={status}
                      onClick={() => setStatus(user.id, status)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Users;