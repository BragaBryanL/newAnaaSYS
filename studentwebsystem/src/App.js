import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StudentWeb from "./pages/studentweb";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentWeb />} />
      </Routes>
    </Router>
  );
}

export default App;
