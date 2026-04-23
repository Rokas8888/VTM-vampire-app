import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import ToastContainer from "./components/shared/ToastContainer";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WizardPage from "./pages/WizardPage";
import GMDashboardPage from "./pages/GMDashboardPage";
import AdminPage from "./pages/AdminPage";
import PlayerDirectoryPage from "./pages/PlayerDirectoryPage";
import SessionModePage from "./pages/SessionModePage";
import SceneMapPrototype from "./components/gm/SceneMapPrototype";
import { lazy, Suspense } from "react";
const SceneMap3D = lazy(() => import("./components/gm/SceneMap3D"));

// Shows a loading screen while we check if the user is logged in
function Loading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <p className="font-gothic text-blood text-2xl animate-pulse">Awakening...</p>
    </div>
  );
}

// Protects routes — redirects to login if not authenticated
function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { init, loading } = useAuthStore();

  // On app load, check if there's a saved token and load the user
  useEffect(() => {
    init();
  }, []);

  if (loading) return <Loading />;

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={["player"]}>
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="/wizard" element={
          <PrivateRoute allowedRoles={["player"]}>
            <WizardPage />
          </PrivateRoute>
        } />
        <Route path="/gm" element={
          <PrivateRoute allowedRoles={["gm", "admin"]}>
            <GMDashboardPage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminPage />
          </PrivateRoute>
        } />
        <Route path="/directory" element={
          <PrivateRoute allowedRoles={["player", "gm", "admin"]}>
            <PlayerDirectoryPage />
          </PrivateRoute>
        } />
        <Route path="/session/:groupId" element={
          <PrivateRoute allowedRoles={["player", "gm", "admin"]}>
            <SessionModePage />
          </PrivateRoute>
        } />
        <Route path="/scene-test" element={
          <PrivateRoute allowedRoles={["gm", "admin"]}>
            <SceneMapPrototype />
          </PrivateRoute>
        } />
        <Route path="/scene-3d" element={
          <PrivateRoute allowedRoles={["gm", "admin"]}>
            <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><p className="font-gothic text-blood animate-pulse">Loading 3D...</p></div>}>
              <SceneMap3D />
            </Suspense>
          </PrivateRoute>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
