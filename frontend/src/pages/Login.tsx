import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { useState } from 'react';
import { Button, Input, Form, message, Card, Typography } from 'antd';

const { Title, Text } = Typography;

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onFinish = async (values: any) => {
        const { username, password } = values;
        setError('');
        setLoading(true);
        try {
            const data = await api.auth.login(username, password);
            login(data.user, data.token);
            message.success('登录成功');
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('登录失败，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background Decorative Elements */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                top: '-200px',
                left: '-200px',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                bottom: '-100px',
                right: '-100px',
                zIndex: 0
            }} />

            <div style={{ zIndex: 1, width: '100%', maxWidth: 420, padding: '0 20px' }}>
                <Card
                    className="glass-card"
                    style={{
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        background: 'rgba(255, 255, 255, 0.65)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'var(--shadow-glass)',
                        overflow: 'hidden'
                    }}
                    bodyStyle={{ padding: '40px 32px' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
                        }}>
                            <Title level={3} style={{ margin: 0, color: 'white', fontWeight: 800 }}>B</Title>
                        </div>
                        <Title level={2} style={{ marginBottom: 8, fontWeight: 700, letterSpacing: '-0.5px' }}>
                            成绩管理系统
                        </Title>
                        <Text type="secondary" style={{ fontSize: 15 }}>
                            欢迎回来! 请登录您的教职工账号
                        </Text>
                    </div>

                    <Form
                        layout="vertical"
                        onFinish={onFinish}
                        size="large"
                        autoComplete="off"
                    >
                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(255, 77, 79, 0.05)',
                                border: '1px solid rgba(255, 77, 79, 0.2)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                color: '#ff4d4f',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>{error}</span>
                            </div>
                        )}

                        <Form.Item
                            label={<span style={{ fontWeight: 500, color: '#475569' }}>用户名</span>}
                            name="username"
                            rules={[{ required: true, message: '请输入用户名' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                                placeholder="教职工 ID / 用户名"
                                style={{ borderRadius: '12px', padding: '10px 14px' }}
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span style={{ fontWeight: 500, color: '#475569' }}>密码</span>}
                            name="password"
                            rules={[{ required: true, message: '请输入密码' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                                placeholder="您的安全密码"
                                style={{ borderRadius: '12px', padding: '10px 14px' }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                style={{
                                    height: '52px',
                                    borderRadius: '14px',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #4f46e5 100%)',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                                }}
                                icon={<ArrowRightOutlined />}
                            >
                                立即进入系统
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <Text type="secondary" style={{ fontSize: 13, opacity: 0.6 }}>
                        © 2024 小学成绩智慧管理平台 版权所有
                    </Text>
                </div>
            </div>
        </div>
    );
}
