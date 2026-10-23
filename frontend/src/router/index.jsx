
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../features/auth/LoginPage";
import RegistrationPage from "../features/auth/RegistrationPage";
import RequireAuth from "../features/auth/RequireAuth";

import CaseDashboard from "../features/investigator/CaseDashboard";
import CaseIntakeForm from "../features/investigator/CaseIntakeForm";
import UploadWizard from "../features/investigator/upload/UploadWizard";
import CaseStatusPage from "../features/investigator/CaseStatusPage";

import SearchPortal from "../features/reviewer/SearchPortal";
import CaseDetailPage from "../features/reviewer/CaseDetailPage";
import ReportGenerator from "../features/reviewer/ReportGenerator";

import AdminConsole from "../features/admin/AdminConsole";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      {/* Investigator routes */}
      <Route
        path="/investigator"
        element={<RequireAuth roles={["investigator"]} />}
      >
        <Route index element={<Navigate to="cases" replace />} />
        <Route path="cases" element={<CaseDashboard />} />
        <Route path="cases/new" element={<CaseIntakeForm />} />
        <Route path="cases/:id/upload" element={<UploadWizard />} />
        <Route path="cases/:id/status" element={<CaseStatusPage />} />
      </Route>

      {/* Reviewer routes */}
      <Route
        path="/review"
        element={
          <RequireAuth
            roles={["insurer", "law_enforcement", "admin"]}
          />
        }
      >
        <Route index element={<Navigate to="cases" replace />} />
        <Route path="cases" element={<SearchPortal />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route
          path="cases/:id/report"
          element={<ReportGenerator />}
        />
      </Route>

      {/* Member 9 report generation */}
      <Route
        element={
          <RequireAuth
            roles={["insurer", "law_enforcement", "admin"]}
          />
        }
      >
        <Route
          path="/reports/generate"
          element={<ReportGenerator />}
        />
      </Route>

      {/* Administration */}
      <Route
        path="/admin"
        element={<RequireAuth roles={["admin"]} />}
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminConsole />} />
      </Route>

      {/* Existing upload URL compatibility */}
      <Route
        path="/cases/:id/upload"
        element={<RequireAuth roles={["investigator"]} />}
      >
        <Route index element={<UploadWizard />} />
      </Route>

      {/* Fallback routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
