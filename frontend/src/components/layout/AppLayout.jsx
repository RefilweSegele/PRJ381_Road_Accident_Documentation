import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Layout, Space, Tag, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;

const ROLE_LABELS = {
  investigator: "Investigator",
  insurer: "Insurer",
  law_enforcement: "Law Enforcement",
  admin: "Admin",
};

export default function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = localStorage.getItem("user_role");

  const handleLogout = () => {
    // Clears the token, role, and the persisted view preference.
    localStorage.clear();
    // Drops cached server data so the next user never sees the previous user's cases.
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
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
  );
}