import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "../layout/AppShell";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import PosPage from "../pages/PosPage";
import CashOpenPage from "../pages/CashOpenPage";
import CashRegistersPage from "../pages/CashRegistersPage";
import CashSessionPage from "../pages/CashSessionPage";
import CashSessionClosedPage from "../pages/CashSessionClosedPage";
import ProductsPage from "../pages/ProductsPage";
import InventoryPage from "../pages/InventoryPage";
import UsersPage from "../pages/UsersPage";
import ForbiddenPage from "../pages/ForbiddenPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute requiredAny={["pos.sell"]}>
              <AppShell>
                <PosPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash"
          element={
            <ProtectedRoute requiredAny={["cash.open"]}>
              <Navigate to="/cash/open" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash/registers"
          element={
            <ProtectedRoute requiredAny={["cash.manage"]}>
              <AppShell>
                <CashRegistersPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash/open"
          element={
            <ProtectedRoute requiredAny={["cash.open"]}>
              <AppShell>
                <CashOpenPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash/session/:id"
          element={
            <ProtectedRoute requiredAny={["cash.open"]}>
              <AppShell>
                <CashSessionPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash/session/:id/closed"
          element={
            <ProtectedRoute requiredAny={["cash.open"]}>
              <AppShell>
                <CashSessionClosedPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute requiredAny={["inventory.manage"]}>
              <AppShell>
                <ProductsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredAny={["inventory.manage"]}>
              <AppShell>
                <InventoryPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredAny={["users.manage"]}>
              <AppShell>
                <UsersPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
