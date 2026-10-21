import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card, Typography, message, Select } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const HOME_BY_ROLE = {
  investigator: "/investigator/cases",
  insurer: "/review/cases",
  law_enforcement: "/review/cases",
  admin: "/admin/users",
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const { data: response } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/login`,
        { email: values.email, password: values.password, role: values.role },
      );

      localStorage.setItem('jwt_token', response.token);
      localStorage.setItem('user_role', response.role);
      
      setupAxiosInterceptors();

      message.success('Authentication successful!');
  
      navigate(HOME_BY_ROLE[response.role] || "/investigator/cases");

    } catch (error) {
      message.error('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>DAIAS Portal</Title>
          <Text type="secondary">Road Accident</Text>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true, role: 'investigator' }}
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email Address" size="large" />
          </Form.Item>

          <Form.Item name="role" label="Demo role" rules={[{ required: true }]}>
            <Select options={[
              { value: 'investigator', label: 'Investigator' },
              { value: 'insurer', label: 'Insurer reviewer' },
              { value: 'law_enforcement', label: 'Law-enforcement reviewer' },
              { value: 'admin', label: 'Administrator' },
            ]} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            Demo accounts: investigator, insurer, law, or admin @daias.demo. Password: SecurePassword123!
          </Text>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={loading} block>
              Log in
            </Button>
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            Need a demo account? <Link to="/register">Register</Link>
          </Text>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
