import React, { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./home.css";

function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Real-time data states
  const [facultyCount, setFacultyCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [consultationCount, setConsultationCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ active: 0, busy: 0, offline: 0 });
  const [monthlyConsultations, setMonthlyConsultations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch real-time data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          facultyRes,
          deptRes,
          consRes,
          statusRes,
          monthlyRes,
          notifRes,
        ] = await Promise.all([
          fetch("http://localhost:5000/api/faculty/count").then((res) => res.json()).catch(() => ({ total: 0 })),
          fetch("http://localhost:5000/api/departments/count").then((res) => res.json()).catch(() => ({ total: 0 })),
          fetch("http://localhost:5000/api/consultations/count").then((res) => res.json()).catch(() => ({ total: 0 })),
          fetch("http://localhost:5000/api/faculty/status-counts").then((res) => res.json()).catch(() => ({ active: 0, busy: 0, offline: 0 })),
          fetch("http://localhost:5000/api/consultations/monthly").then((res) => res.json()).catch(() => []),
          fetch("http://localhost:5000/api/notifications").then((res) => res.json()).catch(() => []),
        ]);
        setFacultyCount(facultyRes.total || 0);
        setDepartmentCount(deptRes.total || 0);
        setConsultationCount(consRes.total || 0);
        setStatusCounts(statusRes || { active: 0, busy: 0, offline: 0 });
        setMonthlyConsultations(Array.isArray(monthlyRes) ? monthlyRes : []);
        setNotifications(Array.isArray(notifRes) ? notifRes : []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Filter notifications for today
  const today = new Date();
  const todayNotifications = notifications.filter(n => {
    const notifDate = new Date(n.created_at);
    return notifDate.toDateString() === today.toDateString();
  });

  const displayedNotifications = showAllNotifications ? notifications : todayNotifications;

  return (
    <>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div
        className="home-wrapper"
        style={{
          marginLeft: sidebarOpen && !isMobile ? "260px" : "0",
          transition: "margin-left 0.3s ease",
          maxWidth: sidebarOpen && !isMobile ? "calc(100% - 260px)" : "100%",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <header className="home-header">
          <h1>Welcome to ANAA System</h1>
          <p>Stay informed. Stay connected.</p>
        </header>

        <section className="home-cards">
          <div className="card">
            <h3>Faculty</h3>
            <div className="number">{facultyCount}</div>
          </div>
          <div className="card">
            <h3>Departments</h3>
            <div className="number">{departmentCount}</div>
          </div>
          <div className="card">
            <h3>Consultations</h3>
            <div className="number">{consultationCount}</div>
          </div>
        </section>

        {/* Monthly Consultations Graph */}
        <section className="system-highlights-graph">
          <h2>Monthly Consultations Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={monthlyConsultations}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#007bff"
                activeDot={{ r: 8 }}
                name="Consultations"
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Faculty Status Overview */}
        <section className="faculty-status">
  <h2>Faculty Status Overview</h2>
  <div className="status-grid status-boxes status-center">
    <div className="status-box active-status">{statusCounts.active}</div>
    <div className="status-box busy-status">{statusCounts.busy}</div>
    <div className="status-box offline-status">{statusCounts.offline}</div>
  </div>
</section>

        {/* Notifications Section */}
        <section className="notifications-section">
          <h2>Notifications</h2>
          <div
            className="status-table notifications-table"
            style={{ maxHeight: 300, overflowY: "auto" }}
          >
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>RFID Number</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {displayedNotifications.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center" }}>
                      No notifications for today.
                    </td>
                  </tr>
                ) : (
                  displayedNotifications.map(
                    ({
                      id,
                      first_name,
                      last_name,
                      department,
                      rfid,
                      type,
                      message,
                      created_at,
                    }) => (
                      <tr key={id}>
                        <td>
                          {first_name} {last_name}
                        </td>
                        <td>{department}</td>
                        <td>{rfid || "-"}</td>
                        <td>{type}</td>
                        <td>{message}</td>
                        <td>{new Date(created_at).toLocaleString()}</td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
          {!showAllNotifications &&
            notifications.length > todayNotifications.length && (
              <button
                onClick={() => setShowAllNotifications(true)}
                className="see-more-btn"
                style={{ marginTop: 10 }}
              >
                See More
              </button>
            )}
          {showAllNotifications && (
            <button
              onClick={() => setShowAllNotifications(false)}
              className="see-more-btn"
              style={{ marginTop: 10 }}
            >
              See Less
            </button>
          )}
        </section>
      </div>
    </>
  );
}

export default Home;