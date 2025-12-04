
const API_URL = 'http://localhost:8787/api';

async function testAI() {
    try {
        console.log('1. Logging in...');
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
            throw new Error(`Login failed: ${loginRes.status} ${text}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('Login successful, token obtained.');

        console.log('2. Generating comment for student ID 1...');
        const aiRes = await fetch(`${API_URL}/ai/generate-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: 1,
                force_regenerate: true
            })
        });

        if (!aiRes.ok) {
            const text = await aiRes.text();
            throw new Error(`AI generation failed: ${aiRes.status} ${text}`);
        }

        const aiData = await aiRes.json();
        console.log('AI Response:', JSON.stringify(aiData, null, 2));

        if (aiData.success) {
            console.log('Test PASSED: Comment generated successfully.');
        } else {
            console.log('Test FAILED: Success flag is false.');
        }

    } catch (error) {
        console.error('Test FAILED:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

testAI();
