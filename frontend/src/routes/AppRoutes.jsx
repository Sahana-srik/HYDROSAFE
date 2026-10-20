import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Incidents from '../pages/Incidents';
import IncidentDetail from '../pages/IncidentDetail';
import Emergency from '../pages/Emergency';
import EmergencyDetail from '../pages/EmergencyDetail';
import Inspections from '../pages/Inspections';
import InspectionDetail from '../pages/InspectionDetail';
import Compliance from '../pages/Compliance';
import AuditLogs from '../pages/AuditLogs';
import AdminUsers from '../pages/AdminUsers';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/emergency/:workflowId" element={<EmergencyDetail />} />

          {/* Role Restricted Routes */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin']}
              />
            }
          >
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/inspections/:id" element={<InspectionDetail />} />
            <Route path="/compliance" element={<Compliance />} />
          </Route>


          <Route
            element={
              <ProtectedRoute
                allowedRoles={['safetyOfficer', 'complianceAdmin', 'superAdmin']}
              />
            }
          >
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Route>

      {/* Security Fallbacks */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
