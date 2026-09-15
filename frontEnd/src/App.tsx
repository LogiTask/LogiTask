import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import Home from "./pages/Home";
import ErrorPage from "./pages/ErrorPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Dev from "./pages/dev";
import CompanySetUp from "./pages/CompanySetUp";
import PropertyView from "./pages/PropertyView";
import ClientView from "./pages/ClientView";
import ScheduleManagement from "./pages/ScheduleManagement";
import { QueryClient, useQueryClient } from "@tanstack/react-query";


const clearAllData = (queryClient: QueryClient) => {
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
};

const Logout: React.FC = () => {
  clearAllData(useQueryClient());
  return <Navigate to="/login" />;
};

const RegisterAndLogout: React.FC = () => {
  clearAllData(useQueryClient());
  return <RegisterPage />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Protected Home Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Protected Company Setup Route */}
        <Route
          path="/company-setup"
          element={
            <ProtectedRoute>
              <CompanySetUp />
            </ProtectedRoute>
          }
        />

        {/* Protected Property View Route */}
        <Route
          path="/property-view/"
          element={
            <ProtectedRoute>
              <PropertyView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-view/"
          element={
            <ProtectedRoute>
              <ClientView />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/schedule-management/"
          element={
            <ProtectedRoute>
              <ScheduleManagement/>
            </ProtectedRoute>
          }
        />

        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="/dev" element={<Dev />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
};

export default App;
