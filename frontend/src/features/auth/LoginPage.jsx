import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';

const { Title, Text } = Typography;

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('user_role', data.role);
      message.success('Authentication successful!');
      navigate('/review/cases');
    } catch (error) {
      message.error(
        error.response?.data?.error || 'Unable to log in. Check that the backend is running.'
      );
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
          initialValues={{ remember: true }}
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

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={loading} block>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
