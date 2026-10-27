import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import "../reviewer/reviewer.css";

const { Title, Text } = Typography;
const ROLES = ["admin", "investigator", "insurer", "law_enforcement"];
const getError = (error) => error?.response?.data?.error || error?.response?.data?.message || error?.message || "Request failed";
const asList = (data, key) => Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : Array.isArray(data?.data) ? data.data : [];

export default function AdminConsole() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const authorized = localStorage.getItem("user_role") === "admin" && !!localStorage.getItem("authToken");

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await apiClient.get("/admin/users");
      setUsers(asList(data, "users"));
      setError("");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await apiClient.get("/admin/jobs");
      setJobs(asList(data, "jobs"));
    } catch (err) {
      message.error(`Unable to load jobs: ${getError(err)}`);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      loadUsers();
      loadJobs();
    }
  }, [authorized, loadUsers, loadJobs]);

  const createUser = async (values) => {
    setCreating(true);
    try {
      await apiClient.post("/admin/users", values);
      message.success("User created");
      setCreateOpen(false);
      form.resetFields();
      await loadUsers();
    } catch (err) {
      message.error(getError(err));
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (user, patch) => {
    setSavingId(String(user.id));
    try {
      await apiClient.patch(`/admin/users/${user.id}`, patch);
      message.success("User updated");
      await loadUsers();
    } catch (err) {
      message.error(getError(err));
    } finally {
      setSavingId(null);
    }
  };

  if (!authorized) {
    return (
      <div style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <Alert type="error" showIcon message="Administrator access required" description="Sign in using an active administrator account." />
        <Button style={{ marginTop: 16 }} onClick={() => navigate("/login")}>Go to login</Button>
      </div>
    );
  }

  const userColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Role", key: "role", render: (_, user) => (
        <Select aria-label={`Role for ${user.email}`} value={user.role} style={{ minWidth: 160 }}
          disabled={savingId === String(user.id)}
          options={ROLES.map((role) => ({ label: role.replaceAll("_", " "), value: role }))}
          onChange={(role) => updateUser(user, { role })} />
      ),
    },
    { title: "Status", key: "status", render: (_, user) => <Tag color={user.status === "active" ? "green" : "red"}>{user.status}</Tag> },
    {
      title: "Action", key: "action", render: (_, user) => (
        <Popconfirm title={`${user.status === "active" ? "Disable" : "Activate"} ${user.email}?`}
          description="This changes the user's ability to sign in."
          onConfirm={() => updateUser(user, { status: user.status === "active" ? "disabled" : "active" })}>
          <Button loading={savingId === String(user.id)} danger={user.status === "active"}>
            {user.status === "active" ? "Disable" : "Activate"}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const jobColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Case", key: "case", render: (_, job) => job.case_reference || job.caseReference || job.case_id || "—" },
    { title: "Status", dataIndex: "status", key: "status", render: (status) => <Tag>{status || "unknown"}</Tag> },
    { title: "Updated", key: "updated", render: (_, job) => {
      const date = job.updated_at || job.updatedAt || job.created_at || job.createdAt;
      return date ? new Date(date).toLocaleString() : "—";
    } },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Administration</h1>
          <p>Manage who can sign in and keep an eye on processing jobs.</p>
        </div>
        <Button onClick={() => navigate("/reports/generate")}>
          Open report generator
        </Button>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message="Unable to load users"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}
      <Tabs
        items={[
          {
            key: "users",
            label: "Users",
            children: (
              <Card
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadUsers}>
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateOpen(true)}
                    >
                      Add user
                    </Button>
                  </Space>
                }
              >
                <Table
                  rowKey={(record) => String(record.id)}
                  columns={userColumns}
                  dataSource={users}
                  loading={loadingUsers}
                  scroll={{ x: 760 }}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: "jobs",
            label: "Processing jobs",
            children: (
              <Card
                extra={
                  <Button icon={<ReloadOutlined />} onClick={loadJobs}>
                    Refresh
                  </Button>
                }
              >
                <Table
                  rowKey={(record, index) => String(record.id ?? index)}
                  columns={jobColumns}
                  dataSource={jobs}
                  loading={loadingJobs}
                  scroll={{ x: 600 }}
                  locale={{ emptyText: "No processing jobs available" }}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />
      <Modal
        title="Create user"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={creating}
        okText="Create user"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createUser}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Full name"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Initial password"
            rules={[
              { required: true },
              { min: 12, message: "Use at least 12 characters" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            initialValue="investigator"
            rules={[{ required: true }]}
          >
            <Select
              options={ROLES.map((role) => ({
                value: role,
                label: role.replaceAll("_", " "),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
