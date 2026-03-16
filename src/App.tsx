import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './components/AuthLayout.tsx';
import Login from './pages/Login.tsx';
import PendingApproval from './pages/PendingApproval.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import Dashboard from './pages/Dashboard.tsx';
import BuildingView from './pages/BuildingView.tsx';

export default function App() {
  return (
    < Router >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pending" element={<PendingApproval />} />

        {/* Protected Routes that require an approved user */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Navigate to="/building" replace />} />
          <Route path="/building" element={<BuildingView />} />
          <Route path="/floor/:floorId" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* We will add /routes and others here later */}
        </Route>
      </Routes>
    </Router >
  );
}
