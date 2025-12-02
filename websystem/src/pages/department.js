import React, { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./department.css";

// Pie chart colors for departments
const PIE_COLORS = [
  "#2ecc71", "#e67e22", "#3498db", "#9b59b6",
  "#e74c3c", "#f1c40f", "#1abc9c", "#34495e"
];

// Safe date formatter
function formatDateTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return "-";
  return d.toLocaleString();
}

function DepartmentPage() {
  const [selectedDept, setSelectedDept] = useState("All");
  const [facultyList, setFacultyList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");

  // Fetch faculty and departments from backend
  const fetchFaculty = () => {
    fetch("http://localhost:5000/faculty")
      .then((res) => res.json())
      .then((data) => setFacultyList(Array.isArray(data) ? data : []))
      .catch(() => setFacultyList([]));
  };
  const fetchDepartments = () => {
    fetch("http://localhost:5000/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  };

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
    const interval = setInterval(() => {
      fetchFaculty();
      fetchDepartments();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Overview counts
  const overview = departments.map((dept, idx) => ({
    name: dept,
    count: facultyList.filter((f) => f.department === dept).length,
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  // Pie chart data (show count in label)
  const pieData = overview.filter((o) => o.count > 0);

  // Filtered list by department and search
  const filteredList = facultyList.filter((f) => {
    const matchesDept = selectedDept === "All" || f.department === selectedDept;
    const matchesSearch =
      f.first_name.toLowerCase().includes(search.toLowerCase()) ||
      f.last_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(search.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  // Color-coded badge for department
  const getDeptBadgeColor = (dept) => {
    const idx = departments.indexOf(dept);
    return PIE_COLORS[idx % PIE_COLORS.length] || "#888";
  };

  // Pie slice click handler
  const handlePieClick = (_, idx) => {
    if (pieData[idx]) {
      setSelectedDept(pieData[idx].name);
    }
  };

  return (
    <div className="department-wrapper">
      <Sidebar className="sidebar" />
      <div className="department-content">
        <h2 style={{ marginBottom: 0 }}>Faculty by Department</h2>

        {/* Pie Chart as filter */}
        <div className="dept-piechart-container" style={{ margin: "0 auto 2rem auto" }}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, count }) => `${name} (${count})`}
                onClick={handlePieClick}
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.color}
                    cursor="pointer"
                    opacity={selectedDept === "All" || selectedDept === entry.name ? 1 : 0.5}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Show All button if filtered */}
        {selectedDept !== "All" && (
          <button
            style={{
              marginBottom: "1rem",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 18px",
              cursor: "pointer"
            }}
            onClick={() => setSelectedDept("All")}
          >
            Show All Departments
          </button>
        )}

        {/* Search */}
        <div className="dept-controls" style={{ marginTop: 10 }}>
          <input
            className="faculty-search"
            type="text"
            placeholder="Search faculty by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="faculty-dept-table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No faculty in this department.
                </td>
              </tr>
            ) : (
              filteredList.map((f) => (
                <tr key={f.id}>
                  <td className="faculty-info-cell">
                    {f.photo ? (
                      <img src={f.photo} className="faculty-photo" alt="Faculty" />
                    ) : (
                      <div className="faculty-photo-placeholder">N/A</div>
                    )}
                    <div className="faculty-name">
                      <strong>
                        {f.first_name} {f.middle_initial && `${f.middle_initial}.`} {f.last_name}
                      </strong>
                      <div className="titles">{Array.isArray(f.titles) ? f.titles.join(", ") : f.titles}</div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="dept-badge"
                      style={{
                        background: getDeptBadgeColor(f.department),
                        color: "#fff",
                        padding: "4px 12px",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        fontSize: "0.95em",
                      }}
                    >
                      {f.department}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${f.status ? f.status.toLowerCase() : ""}`}>
                      {f.status || "-"}
                    </span>
                  </td>
                  <td>{formatDateTime(f.last_updated)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DepartmentPage;