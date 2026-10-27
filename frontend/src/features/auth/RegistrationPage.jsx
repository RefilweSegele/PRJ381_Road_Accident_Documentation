
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Typography,
  message
} from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const HOME_BY_ROLE = {
  investigator: "/investigator/cases",
  insurer: "/review/cases",
  law_enforcement: "/review/cases"
};

export default function RegistrationPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function register(values) {
    setLoading(true);

    try {
      const { name, email, password, role } = values;

      const { data } = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { name, email, password, role }
      );

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user_role", data.role);

      message.success("Account created successfully.");
      navigate(HOME_BY_ROLE[data.role] || "/review/cases", {
        replace: true
      });
    } catch (error) {
      message.error(
        error.response?.data?.error || "Could not create the account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: 24,
        background: "#f0f2f5"
      }}
    >
      <Card style={{ width: 440, maxWidth: "100%" }}>
        <Title level={3} style={{ textAlign: "center" }}>
          Create account
        </Title>

        <Text
          type="secondary"
          style={{
            display: "block",
            textAlign: "center",
            marginBottom: 20
          }}
        >
          DAIAS Road Accident Portal
        </Text>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Account registration"
          description="Administrator accounts are managed separately."
        />

        <Form
          layout="vertical"
          onFinish={register}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Full name"
            rules={[{
              required: true,
              whitespace: true,
              message: "Enter your full name"
            }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Full name"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Enter your email" },
              { type: "email", message: "Enter a valid email" }
            ]}
          >
            <Input
              placeholder="you@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            initialValue="investigator"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "investigator", label: "Investigator" },
                { value: "insurer", label: "Insurer reviewer" },
                {
                  value: "law_enforcement",
                  label: "Law-enforcement reviewer"
                }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Create a password" },
              { min: 8, message: "Use at least 8 characters" }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value ||
                    getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Passwords do not match")
                      );
                }
              })
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            Create account
          </Button>
        </Form>

        <Text
          type="secondary"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16
          }}
        >
          Already registered? <Link to="/login">Log in</Link>
        </Text>
      </Card>
    </div>
  );
}
