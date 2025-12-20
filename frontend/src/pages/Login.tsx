import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { useState } from 'react';

interface LoginForm {
    username: string;
    password: string;
}

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const onFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('请输入用户名和密码');
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.login(username, password);

            login(data.user, data.token);
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            // 显示后端返回的具体错误信息
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
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            <div style={{
                width: '90%',
                maxWidth: 400,
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
                        小学成绩管理系统
                    </h1>
                    <p style={{ color: '#6b7280' }}>欢迎回来，请登录您的账号</p>
                </div>

                <form onSubmit={onFinish}>
                    {error && (
                        <div style={{
                            backgroundColor: '#fff2f0',
                            border: '1px solid #ffccc7',
                            borderRadius: '4px',
                            padding: '12px',
                            marginBottom: '16px',
                            color: '#ff4d4f',
                            fontSize: '14px',
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#333',
                            fontSize: '14px',
                            fontWeight: 500,
                        }}>
                            用户名
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '8px 12px',
                        }}>
                            <UserOutlined style={{ marginRight: '8px', color: '#999' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="请输入用户名"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '14px',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#333',
                            fontSize: '14px',
                            fontWeight: 500,
                        }}>
                            密码
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '8px 12px',
                        }}>
                            <LockOutlined style={{ marginRight: '8px', color: '#999' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="请输入密码"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '14px',
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '44px',
                            backgroundColor: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? '登录中...' : '登录'}
                    </button>
                </form>
            </div>
        </div>
    );
}
