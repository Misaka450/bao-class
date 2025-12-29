
const API_URL = 'https://api.980823.xyz/api';

async function testAI() {
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

        if (!loginRes.ok) {
            const text = await loginRes.text();
            throw new Error(`登录失败: ${loginRes.status} ${text}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('✓ 登录成功，已获取 token');

        console.log('\n2. 为学生 ID 91 生成评语...');
        const aiRes = await fetch(`${API_URL}/ai/generate-comment`, {
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

        if (!aiRes.ok) {
            const text = await aiRes.text();
            throw new Error(`AI 生成失败: ${aiRes.status} ${text}`);
        }

        const aiData = await aiRes.json();
        console.log('\n=== AI 响应 ===');
        console.log(JSON.stringify(aiData, null, 2));

        if (aiData.success) {
            console.log('\n✓ 测试通过: 评语生成成功');
            console.log('\n生成的评语:');
            console.log('---');
            console.log(aiData.comment);
            console.log('---');
            console.log('\n元数据:');
            console.log(`  学生姓名: ${aiData.metadata.student_name}`);
            console.log(`  平均分: ${aiData.metadata.avg_score}`);
            console.log(`  成绩趋势: ${aiData.metadata.trend}`);
            console.log(`  优势科目: ${aiData.metadata.strong_subjects}`);
            console.log(`  薄弱科目: ${aiData.metadata.weak_subjects}`);
        } else {
            console.log('\n✗ 测试失败: success 标志为 false');
        }

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        if (error.cause) {
            console.error('原因:', error.cause);
        }
    }
}

testAI();
