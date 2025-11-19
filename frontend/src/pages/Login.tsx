import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

interface LoginForm {
    username: string;
    password: string;
}

export default function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: LoginForm) => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8787/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const error = await res.json();
                message.error(error.error || '登录失败');
                return;
            }

            const data = await res.json();
            setAuth(data.token, data.user);
            message.success('登录成功！');
            navigate('/dashboard');
        } catch (error) {
            message.error('登录失败，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            <Card
                style={{
                    width: 400,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
                        小学成绩管理系统
                    </h1>
                    <p style={{ color: '#6b7280' }}>欢迎回来，请登录您的账号</p>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="用户名"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{ height: 44 }}
                        >
                            登录
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    <p>测试账号: admin / admin123</p>
                    <p>教师账号: teacher / teacher123</p>
                </div>
            </Card>
        </div>
    );
}
