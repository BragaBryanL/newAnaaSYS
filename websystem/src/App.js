import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/login";
import Home from "./pages/home";
import Registration from "./pages/registration";
import Department from "./pages/department";
import Users from "./pages/users";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Lift facultyList state here so it can be shared
  const [facultyList, setFacultyList] = useState([]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Login onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home facultyList={facultyList} setFacultyList={setFacultyList} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/registration"
          element={
            isAuthenticated ? (
              <Registration facultyList={facultyList} setFacultyList={setFacultyList} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/department"
          element={
            isAuthenticated ? (
              <Department facultyList={facultyList} setFacultyList={setFacultyList} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? (
              <Users facultyList={facultyList} setFacultyList={setFacultyList} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
