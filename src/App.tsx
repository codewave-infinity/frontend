import { Navigate, Route, Routes } from "react-router-dom";
import Login from "@/routes/Login";
import Dashboard from "@/routes/Dashboard";
import Admin from "@/routes/Admin";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/lib/store";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
