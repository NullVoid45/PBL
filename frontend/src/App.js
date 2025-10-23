import { useMemo } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/sonner";

const AuthedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
};

export default function App() {
  const isAuthed = !!localStorage.getItem("token");
  const onLogout = () => { localStorage.removeItem("token"); window.location.href = "/login"; };
  return (
    <div className="min-h-screen bg-[#E8F5E9] text-[#1B1B1B]">
      <BrowserRouter>
        <Navbar isAuthed={isAuthed} onLogout={onLogout} />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<AuthedRoute><Dashboard /></AuthedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </div>
  );
}
