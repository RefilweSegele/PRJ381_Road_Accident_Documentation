// frontend/src/router/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/LoginPage";
import RegistrationPage from "../features/auth/RegistrationPage";
import RequireAuth from "../features/auth/RequireAuth";
import CaseDashboard from "../features/investigator/CaseDashboard";
import CaseIntakeForm from "../features/investigator/CaseIntakeForm";
import UploadWizard from "../features/investigator/upload/UploadWizard";
import SearchPortal from "../features/reviewer/SearchPortal";
import CaseDetailPage from "../features/reviewer/CaseDetailPage";
import ReportGenerator from "../features/reviewer/ReportGenerator";
import UserPipelineMgmt from "../features/admin/UserPipelineMgmt";
import CaseStatusPage from "../features/investigator/CaseStatusPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      {/* Investigator */}
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

      {/* Reviewer (insurer + law enforcement) */}
      <Route
        path="/review"
        element={<RequireAuth roles={["insurer", "law_enforcement"]} />}
      >
        <Route index element={<Navigate to="cases" replace />} />
        <Route path="cases" element={<SearchPortal />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="cases/:id/report" element={<ReportGenerator />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth roles={["admin"]} />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UserPipelineMgmt />} />
      </Route>

      {/* Fallbacks */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
