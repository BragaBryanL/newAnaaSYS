import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "../components/sidebar";
import "./registration.css";

const titleOptions = [
  "Asst. Prof.",
  "MIT",
  "PhD",
  "Prof.",
  "Inst.",
  "MA",
  "MS",
  "BS",
  "BA",
];

const departmentOptionsInitial = [
  { label: "Information Technology (IT)", value: "IT" },
  { label: "Data Science (DS)", value: "DS" },
  { label: "Computer Science (CS)", value: "CS" },
  { label: "Technology Communication Management (TCM)", value: "TCM" },
];

function FacultyRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleInitials: "",
    lastName: "",
    titles: [],
    email: "",
    rfid: "",
    department: "",
    password: "",
    confirmPassword: "",
    photo: null,
  });

  const [errors, setErrors] = useState({});
  const [facultyList, setFacultyList] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [departments] = useState(departmentOptionsInitial);

  // Fetch faculty from backend on mount and after add
  const fetchFaculty = () => {
    fetch("http://localhost:5000/faculty")
      .then((res) => res.json())
      .then((data) => setFacultyList(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching faculty:", err);
        setFacultyList([]);
      });
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, files } = e.target;

    if (name === "titles") {
      let newTitles = [...formData.titles];
      checked
        ? newTitles.push(value)
        : (newTitles = newTitles.filter((title) => title !== value));
      setFormData({ ...formData, titles: newTitles });
    } else if (name === "photo") {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, photo: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // --- FIXED VALIDATE FUNCTION ---
  const validate = () => {
    let tempErrors = {};
    if (!formData.firstName.trim()) tempErrors.firstName = "First Name is required";
    if (!formData.lastName.trim()) tempErrors.lastName = "Last Name is required";
    if (formData.titles.length === 0) tempErrors.titles = "Please select at least one Title";
    if (!formData.email.trim()) tempErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) tempErrors.email = "Email is invalid";
    if (!formData.rfid.trim()) tempErrors.rfid = "RFID is required";
    if (!formData.department) tempErrors.department = "Department is required";

    // Password validation
    if (editIndex === null) {
      // ADD mode: always require password
      if (!formData.password) tempErrors.password = "Password is required";
      if (!formData.confirmPassword) tempErrors.confirmPassword = "Confirm Password is required";
      else if (formData.password !== formData.confirmPassword)
        tempErrors.confirmPassword = "Passwords do not match";
    } else {
      // EDIT mode: only require if one is filled
      if (formData.password || formData.confirmPassword) {
        if (!formData.password) tempErrors.password = "Password is required";
        if (!formData.confirmPassword) tempErrors.confirmPassword = "Confirm Password is required";
        else if (formData.password !== formData.confirmPassword)
          tempErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };
  // --- END FIXED VALIDATE FUNCTION ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      if (editIndex !== null) {
        // EDIT MODE
        const faculty = filteredFaculty[editIndex];
        try {
          const response = await fetch(`http://localhost:5000/faculty/${faculty.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: formData.firstName,
              middleInitials: formData.middleInitials,
              lastName: formData.lastName,
              titles: formData.titles,
              email: formData.email,
              rfid: formData.rfid,
              department: formData.department,
              photo: formData.photo,
              password: formData.password, // Only sent if changed
            }),
          });
          if (response.ok) {
            alert("Faculty updated successfully!");
            fetchFaculty();
            setFormData({
              firstName: "",
              middleInitials: "",
              lastName: "",
              titles: [],
              email: "",
              rfid: "",
              department: "",
              password: "",
              confirmPassword: "",
              photo: null,
            });
            setErrors({});
            setShowForm(false);
            setEditIndex(null);
          } else {
            const err = await response.json();
            alert("Error: " + (err.message || err.error));
          }
        } catch (error) {
          alert("Network error: " + error.message);
        }
      } else {
        // ADD MODE
        try {
          const response = await fetch("http://localhost:5000/faculty/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: formData.firstName,
              middleInitials: formData.middleInitials,
              lastName: formData.lastName,
              titles: formData.titles,
              email: formData.email,
              rfid: formData.rfid,
              department: formData.department,
              password: formData.password,
              photo: formData.photo,
            }),
          });
          if (response.ok) {
            alert("Faculty registered successfully!");
            fetchFaculty();
            setFormData({
              firstName: "",
              middleInitials: "",
              lastName: "",
              titles: [],
              email: "",
              rfid: "",
              department: "",
              password: "",
              confirmPassword: "",
              photo: null,
            });
            setErrors({});
            setShowForm(false);
            setEditIndex(null);
          } else {
            const err = await response.json();
            alert("Error: " + (err.message || err.error));
          }
        } catch (error) {
          alert("Network error: " + error.message);
        }
      }
    }
  };

  const handleDelete = async (index) => {
    const faculty = filteredFaculty[index];
    if (!faculty) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this faculty?");
    if (confirmDelete) {
      try {
        await fetch(`http://localhost:5000/faculty/${faculty.id}`, {
          method: "DELETE",
        });
        fetchFaculty();
      } catch (err) {
        alert("Error deleting faculty.");
      }
    }
  };

  const handleEdit = (index) => {
    const facultyToEdit = filteredFaculty[index];
    if (!facultyToEdit) return;
    setFormData({
      firstName: facultyToEdit.first_name,
      middleInitials: facultyToEdit.middle_initial,
      lastName: facultyToEdit.last_name,
      titles: facultyToEdit.titles || [],
      email: facultyToEdit.email,
      rfid: facultyToEdit.rfid,
      department: facultyToEdit.department,
      password: "",
      confirmPassword: "",
      photo: facultyToEdit.photo || null,
    });
    setEditIndex(index);
    setShowForm(true);
  };

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((faculty) => {
      const fullName = `${faculty.first_name} ${faculty.middle_initial || ""} ${faculty.last_name} ${(faculty.titles || []).join(" ")}`.toLowerCase();
      return (
        fullName.includes(filterText.toLowerCase()) ||
        (faculty.email && faculty.email.toLowerCase().includes(filterText.toLowerCase())) ||
        (faculty.rfid && faculty.rfid.toLowerCase().includes(filterText.toLowerCase())) ||
        (faculty.department && faculty.department.toLowerCase().includes(filterText.toLowerCase()))
      );
    });
  }, [filterText, facultyList]);

  return (
    <div className="registration-wrapper">
      <div className="page-content">
        <Sidebar />
        <div className="registration-content">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setFormData({
                firstName: "",
                middleInitials: "",
                lastName: "",
                titles: [],
                email: "",
                rfid: "",
                department: "",
                password: "",
                confirmPassword: "",
                photo: null,
              });
              setEditIndex(null);
            }}
            className="toggle-form-btn"
            type="button"
          >
            {showForm ? "− Hide Registration Form" : "+ Add Faculty"}
          </button>

          {showForm ? (
            <form className="faculty-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <label htmlFor="firstName">First Name *</label>
                <input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} />
                {errors.firstName && <span className="error">{errors.firstName}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="middleInitials">Middle Initials (Optional)</label>
                <input id="middleInitials" name="middleInitials" value={formData.middleInitials} onChange={handleChange} maxLength={3} />
              </div>
              <div className="form-row">
                <label htmlFor="lastName">Last Name *</label>
                <input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} />
                {errors.lastName && <span className="error">{errors.lastName}</span>}
              </div>
              <fieldset className="form-row">
                <legend>Titles *</legend>
                <div className="titles-options">
                  {titleOptions.map((title) => (
                    <label key={title}>
                      <input type="checkbox" name="titles" value={title} checked={formData.titles.includes(title)} onChange={handleChange} />
                      {title}
                    </label>
                  ))}
                </div>
                {errors.titles && <span className="error">{errors.titles}</span>}
              </fieldset>
              <div className="form-row">
                <label htmlFor="department">Department *</label>
                <select id="department" name="department" value={formData.department} onChange={handleChange}>
                  <option value="">Select department</option>
                  {departments.map(({ label, value }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.department && <span className="error">{errors.department}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="email">Email *</label>
                <input id="email" name="email" value={formData.email} onChange={handleChange} />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="rfid">RFID *</label>
                <input id="rfid" name="rfid" value={formData.rfid} onChange={handleChange} />
                {errors.rfid && <span className="error">{errors.rfid}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="password">
                  Password {editIndex !== null ? "(leave blank to keep current)" : "*"}
                </label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} />
                {errors.password && <span className="error">{errors.password}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="confirmPassword">
                  Confirm Password {editIndex !== null ? "(leave blank to keep current)" : "*"}
                </label>
                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="photo">Profile Picture (optional)</label>
                <input type="file" id="photo" name="photo" accept="image/*" onChange={handleChange} />
                {formData.photo && <img src={formData.photo} alt="Profile Preview" className="photo-preview" />}
              </div>
              <button type="submit" className="register-btn">
                {editIndex !== null ? "Update Faculty" : "Register Faculty"}
              </button>
            </form>
          ) : (
            <div className="faculty-table-wrapper">
              <h3>Registered Faculty</h3>
              <input
                type="text"
                placeholder="Filter by name, email, RFID, or department..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
              />
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Full Name & Titles</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th>RFID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>No faculty found.</td>
                    </tr>
                  ) : (
                    filteredFaculty.map((faculty, idx) => (
                      <tr key={faculty.id}>
                        <td>
                          {faculty.photo ? (
                            <img src={faculty.photo} alt="Profile" className="faculty-photo" />
                          ) : (
                            <div className="faculty-photo-placeholder">N/A</div>
                          )}
                        </td>
                        <td>
                          {faculty.first_name} {faculty.middle_initial && `${faculty.middle_initial}.`} {faculty.last_name}{" "}
                          {faculty.titles && faculty.titles.length > 0 && `(${faculty.titles.join(", ")})`}
                        </td>
                        <td>{faculty.department}</td>
                        <td>{faculty.email}</td>
                        <td>{faculty.rfid}</td>
                        <td>
                          <button className="edit-btn" onClick={() => handleEdit(idx)}>Edit</button>
                          <button className="delete-btn" onClick={() => handleDelete(idx)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FacultyRegistration;