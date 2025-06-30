import React from 'react';
import Sidebar from "../components/sidebar";// Adjust if needed
import './consultation.css';

const consultations = [
  {
    id: 1,
    studentName: 'Maria Santos',
    schoolId: '2023-00123',
    faculty: 'Prof. Dela Cruz',
    date: '2025-05-30',
    time: '10:00 AM',
    status: 'pending',
  },
  {
    id: 2,
    studentName: 'Juan Dela Cruz',
    schoolId: '2023-00456',
    faculty: 'Prof. Reyes',
    date: '2025-06-01',
    time: '02:30 PM',
    status: 'approved',
  },
];

const ConsultationPage = () => {
  return (
    <div className="consultation-page">
      <Sidebar />

      <main className="consultation-content">
        <h2>Student Consultations</h2>

        <table className="consultation-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>School ID</th>
              <th>Faculty</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((consultation) => (
              <tr key={consultation.id}>
                <td>{consultation.studentName}</td>
                <td>{consultation.schoolId}</td>
                <td>{consultation.faculty}</td>
                <td>{consultation.date}</td>
                <td>{consultation.time}</td>
                <td>
                  <span className={`status-badge ${consultation.status}`}>
                    {consultation.status}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn-approve">Approve</button>
                  <button className="btn-cancel">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default ConsultationPage;
