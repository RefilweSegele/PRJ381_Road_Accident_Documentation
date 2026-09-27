import React, { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserAddOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const initialUsers = [
  {
    key: "USR-001",
    name: "Admin User",
    email: "admin@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    key: "USR-002",
    name: "Investigator Demo",
    email: "investigator@example.com",
    role: "Investigator",
    status: "Active",
  },
  {
    key: "USR-003",
    name: "Reviewer Demo",
    email: "reviewer@example.com",
    role: "Reviewer",
    status: "Active",
  },
];

const initialJobs = [
  { key: "JOB-101", case: "RA-2026-00124", type: "ODM", status: "Running", progress: 72 },
  { key: "JOB-102", case: "RA-2026-00125", type: "ML", status: "Queued", progress: 0 },
  { key: "JOB-103", case: "RA-2026-00123", type: "Report", status: "Completed", progress: 100 },
];

export default function UserPipelineMgmt({
  users: usersProp,
  jobs: jobsProp,
  onCreateUser,
  onDeleteUser,
}) {
  const [users, setUsers] = useState(usersProp || initialUsers);
  const [jobs] = useState(jobsProp || initialJobs);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "Active").length,
    [users]
  );

  const runningJobs = jobs.filter((job) => job.status === "Running").length;
  const queuedJobs = jobs.filter((job) => job.status === "Queued").length;

  const createUser = async () => {
    const values = await form.validateFields();

    const newUser = {
      key: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: values.name,
      email: values.email,
      role: values.role,
      status: "Active",
    };

    setUsers((current) => [...current, newUser]);
    onCreateUser?.(newUser);
    form.resetFields();
    setModalOpen(false);
  };

  const deleteUser = (user) => {
    Modal.confirm({
      title: "Remove user?",
      content: `Remove ${user.name} from the admin user list?`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: () => {
        setUsers((current) => current.filter((item) => item.key !== user.key));
        onDeleteUser?.(user);
      },
    });
  };

  const userColumns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (name, user) => (
        <Space>
          <Avatar>{name.charAt(0).toUpperCase()}</Avatar>
          <div>
            <div>{name}</div>
            <Text type="secondary">{user.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => <Tag>{role}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge status={status === "Active" ? "success" : "default"} text={status} />
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, user) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => deleteUser(user)}
        >
          Remove
        </Button>
      ),
    },
  ];

  const jobColumns = [
    {
      title: "Job",
      dataIndex: "key",
      key: "key",
    },
    {
      title: "Case",
      dataIndex: "case",
      key: "case",
    },
    {
      title: "Pipeline",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color =
          status === "Completed"
            ? "green"
            : status === "Running"
            ? "blue"
            : "gold";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      render: (progress) => <Progress percent={progress} size="small" />,
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <SettingOutlined /> Admin Console
        </Title>
        <Text type="secondary">
          Page 8 — user provisioning and processing queue health.
        </Text>
      </Space>

      <Alert
        type="info"
        showIcon
        message="Admin-only area"
        description="The production version should be protected by the backend role-based access-control middleware."
        style={{ marginBottom: 20 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Active users" value={activeUsers} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Running jobs" value={runningJobs} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Queued jobs" value={queuedJobs} />
          </Card>
        </Col>
      </Row>

      <Card
        title="User Provisioning"
        style={{ marginTop: 20 }}
        extra={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Add User
          </Button>
        }
      >
        <Table
          rowKey="key"
          columns={userColumns}
          dataSource={users}
          pagination={{ pageSize: 5 }}
          scroll={{ x: 700 }}
        />
      </Card>

      <Card
        title="Pipeline Queue Health"
        style={{ marginTop: 20 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            Refresh
          </Button>
        }
      >
        <Table
          rowKey="key"
          columns={jobColumns}
          dataSource={jobs}
          pagination={false}
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title="Provision User"
        open={modalOpen}
        onCancel={() => {
          form.resetFields();
          setModalOpen(false);
        }}
        onOk={createUser}
        okText="Create User"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Full name"
            rules={[{ required: true, message: "Enter the user's name." }]}
          >
            <Input placeholder="e.g. Jane Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Enter an email address." },
              { type: "email", message: "Enter a valid email address." },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Select a role." }]}
          >
            <Select
              placeholder="Select role"
              options={[
                { value: "Admin", label: "Admin" },
                { value: "Investigator", label: "Investigator" },
                { value: "Reviewer", label: "Reviewer" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
