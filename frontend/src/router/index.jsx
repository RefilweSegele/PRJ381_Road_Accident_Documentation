import { Routes, Route, Navigate } from "react-router-dom";
import CaseDetailPage from ".../CaseDetailPage";
import SearchPortal from ".../SearchPortal";
import UploadWizard from ".../UploadWizard";
import LoginPage from ".../LoginPage";
import ProcessingStatus from ".../ProcessingStatus";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<UploadWizard />} />
      <Route path="/cases/:id/upload" element={<UploadWizard />} />
      <Route path="/cases/:id/status" element={<ProcessingStatus />} />
      <Route path="/review/cases" element={<SearchPortal />} />
      <Route path="/review/cases/:id" element={<CaseDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}