import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FilePlus2,
  FileText,
  FolderOpen,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import "./AppLayout.css";

const ROLE_LABELS = {
  investigator: "Investigator",
  insurer: "Insurer",
  law_enforcement: "Law Enforcement",
  admin: "Administrator",
};

// Sidebar links per role. Mirrors the route guards in router/index.jsx,
// so a user only ever sees links they are allowed to open.
const NAV_BY_ROLE = {
  investigator: [
    { to: "/investigator/cases", label: "My cases", icon: FolderOpen, end: true },
    { to: "/investigator/cases/new", label: "New case", icon: FilePlus2 },
  ],
  insurer: [
    { to: "/review/cases", label: "Case search", icon: Search },
    { to: "/reports/generate", label: "Report generator", icon: FileText },
  ],
  law_enforcement: [
    { to: "/review/cases", label: "Case search", icon: Search },
    { to: "/reports/generate", label: "Report generator", icon: FileText },
  ],
  admin: [
    { to: "/admin/users", label: "Administration", icon: ShieldCheck },
    { to: "/review/cases", label: "Case search", icon: Search },
    { to: "/reports/generate", label: "Report generator", icon: FileText },
  ],
};

// Page title shown in the top bar, derived from the URL.
function titleFor(pathname) {
  if (pathname.endsWith("/new")) return "New case";
  if (pathname.endsWith("/upload")) return "Upload case data";
  if (pathname.endsWith("/status")) return "Case status";
  if (pathname.endsWith("/report") || pathname.startsWith("/reports")) return "Report generator";
  if (pathname.startsWith("/investigator")) return "My cases";
  if (pathname.startsWith("/review/cases/")) return "Case viewer";
  if (pathname.startsWith("/review")) return "Case search";
  if (pathname.startsWith("/admin")) return "Administration";
  return "DAIAS";
}

function readCollapsed() {
  try {
    return localStorage.getItem("daias_sidebar") === "collapsed";
  } catch {
    return false;
  }
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const role = localStorage.getItem("user_role");
  const items = NAV_BY_ROLE[role] || [];

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("daias_sidebar", next ? "collapsed" : "open");
      } catch {
        /* storage unavailable: the toggle still works for this visit */
      }
      return next;
    });
  };

  const handleLogout = () => {
    // Clears the token, role, and the persisted view preference.
    localStorage.clear();
    // Drops cached server data so the next user never sees the previous user's cases.
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
 redesigning_demo
    <div className={`shell ${collapsed ? "shell--collapsed" : ""}`}>
      {mobileOpen && <div className="shell__scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`rail ${mobileOpen ? "rail--open" : ""}`} aria-label="Main navigation">
        <div className="rail__brand">
          <div className="rail__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <rect width="32" height="32" rx="9" fill="#f5b301" />
              <path d="M16 6v4M16 14v4M16 22v4" stroke="#12161d" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="rail__name">
            <strong>DAIAS</strong>
            <span>Accident documentation</span>
          </div>
          <button
            type="button"
            className="rail__close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="rail__nav">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `rail__link ${isActive ? "rail__link--active" : ""}`}
            >
              <span className="rail__dash" aria-hidden="true" />
              <Icon size={18} strokeWidth={1.9} />
              <span className="rail__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail__foot">
          <div className="rail__user">
            <div className="rail__avatar" aria-hidden="true">
              {(ROLE_LABELS[role] || "U").charAt(0)}
            </div>
            <div className="rail__who">
              <strong>{ROLE_LABELS[role] || "Signed in"}</strong>
              <span>DAIAS account</span>
            </div>
          </div>
          <button type="button" className="rail__action" onClick={handleLogout} title="Log out">
            <LogOut size={17} />
            <span className="rail__label">Log out</span>
          </button>
          <button
            type="button"
            className="rail__action rail__action--collapse"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className="rail__label">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="topbar__title">{titleFor(location.pathname)}</h1>
          <span className="topbar__role">{ROLE_LABELS[role] || ""}</span>
        </header>
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>

    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#001529",
          padding: "0 24px",
        }}
      >
        <Typography.Text strong style={{ color: "#fff" }}>
          DAIAS Portal
        </Typography.Text>
        <Space>
            <Link to="/damage-test" style={{ color: "rgba(255,255,255,0.75)" }}> 
            Damage Test
            </Link>
          {role && <Tag>{ROLE_LABELS[role] || role}</Tag>}
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Log out
          </Button>
        </Space>
      </Header>
      <Content style={{ background: "#f0f2f5" }}>
        <Outlet />
      </Content>
    </Layout>
 main
  );
}