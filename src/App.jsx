// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/home.jsx";
import UploadExcel from "./pages/UploadExcel.jsx";
import Schedule from "./pages/Schedule.jsx";
import CourseProgress from "./pages/CourseProgress.jsx";
import Enrollments from "./pages/Enrollments.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/upload" element={<UploadExcel />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/progress" element={<CourseProgress />} />
        <Route path="/enroll" element={<Enrollments />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
