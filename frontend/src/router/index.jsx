import { Routes, Route } from "react-router-dom";
import CaseDetailPage from "../features/reviewer/CaseDetailPage";
import SearchPortal from "../features/reviewer/SearchPortal";
import UploadWizard from "../features/investigator/upload/UploadWizard";
import LoginPage from "../features/auth/LoginPage";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<UploadWizard />} />
            <Route path="/review/cases" element={<SearchPortal />} />
            <Route path="/review/cases/:id" element={<CaseDetailPage />} />
        </Routes>
    )
};
