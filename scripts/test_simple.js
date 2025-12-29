const API_URL = 'https://api.980823.xyz/api';

async function testAISimple() {
    try {
        console.log('1. 登录中...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'baobao123'
            })
        });

        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('✓ 登录成功');

        console.log('\n2. 测试学生 ID 91...');
        const res = await fetch(`${API_URL}/ai/generate-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: 91,
                force_regenerate: true
            })
        });

        const data = await res.json();
        console.log('\n完整响应:');
        console.log(JSON.stringify(data, null, 2));

        // 检查 Cloudflare Workers 日志
        console.log('\n请查看 Cloudflare Dashboard 的实时日志:');
        console.log('https://dash.cloudflare.com/');
        console.log('Workers & Pages > bao-class-api > Logs');

    } catch (error) {
        console.error('\n错误:', error.message);
    }
}

testAISimple();
