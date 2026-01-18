// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
  return (
    <div className="container center">
      <div className="card hero">
        <p className="h2">Oturum kontrol ediliyor...</p>
      </div>
    </div>
  );
}
 // ya da küçük bir loader

  // oturum yoksa login'e yönlendir
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
