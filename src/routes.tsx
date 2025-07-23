import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import GlobalLayout from "./components/layouts/globalLayout";
import LoginPage from "./pages/login";
import AuthenticatedLayout from "./components/layouts/authenticatedLayout";
import UnauthenticatedLayout from "./components/layouts/unauthenticatedLayout";
import DashboardPage from "./pages/dashboard";
import DashboardLayout from "./components/layouts/dashboardLayout";

const SystemRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GlobalLayout />}>
          <Route path="/" element={<App />} />
          <Route element={<AuthenticatedLayout />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
          <Route element={<UnauthenticatedLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default SystemRoutes;
