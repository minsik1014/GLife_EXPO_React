// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const enforceAuth =
    String(import.meta.env.VITE_USE_LOCAL_AUTH ?? "")
      .toLowerCase()
      .trim() === "true";

  if (!enforceAuth) {
    return children;
  }

  const token = localStorage.getItem("token"); // 세션/쿠키 쓰면 서버 핑 방식으로 대체
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
