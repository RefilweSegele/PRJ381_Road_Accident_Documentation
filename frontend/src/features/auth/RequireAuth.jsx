import { Navigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";

// Where each role belongs. Used both to guard routes and to redirect
// someone who lands on a section they aren't allowed into.
const HOME_BY_ROLE = {
  investigator: "/investigator/cases",
  insurer: "/review/cases",
  law_enforcement: "/review/cases",
  admin: "/admin/users",
};


export default function RequireAuth({ roles }) {
  const token = localStorage.getItem("jwt_token");
  const role = localStorage.getItem("user_role");

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(role)) {
    // Wrong section for this role: send them to their own home, not an error page.
    return <Navigate to={HOME_BY_ROLE[role] || "/login"} replace />;
  }

  // Layout wraps the matched child route via its own <Outlet />.
  return <AppLayout />;
}