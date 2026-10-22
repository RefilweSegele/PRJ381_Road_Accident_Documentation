
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Card,
  Typography,
  message,
} from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/login", {
        email: values.email.trim(),
        password: values.password,
      });

      if (!data.token || !data.role) {
        throw new Error("Invalid authentication response");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user_role", data.role);

      message.success("Authentication successful!");

      if (data.role === "admin") {
        navigate("/reports/generate", { replace: true });
      } else {
        navigate("/review/cases", { replace: true });
      }
    } catch (error) {
      message.error(
        error.response?.data?.error ||
        error.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400, maxWidth: "95%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3}>DAIAS Portal</Title>
          <Text type="secondary">
            Road Accident Documentation
          </Text>
        </div>

        <Form
          name="login_form"
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Enter your email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email Address"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Enter your password" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            Log in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
