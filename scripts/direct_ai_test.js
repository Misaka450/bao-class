// Direct AI model test script
const API_BASE_URL = 'https://api.980823.xyz';

async function login() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'baobao123'
            })
        });
        
        const data = await response.json();
        if (data.success && data.data && data.data.token) {
            console.log('✅ Login successful!');
            return data.data.token;
        } else {
            console.error('❌ Login failed:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Login error:', error);
        return null;
    }
}

async function testDirectAI(token) {
    try {
        console.log('Testing direct AI model call...');
        
        const response = await fetch(`${API_BASE_URL}/api/debug/test-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                prompt: "你好，请用中文回答：你是谁？",
                model: "@cf/qwen/qwen3-30b-a3b-fp8"
            })
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('✅ Direct AI call successful!');
        } else {
            console.log('❌ Direct AI call failed');
        }
    } catch (error) {
        console.error('Direct AI test failed with error:', error);
    }
}

async function main() {
    console.log('Starting direct AI test with authentication...');
    
    // 1. Login to get token
    const token = await login();
    
    if (token) {
        // 2. Test direct AI call
        await testDirectAI(token);
    } else {
        console.log('Cannot proceed without authentication token');
    }
}

// Run the test
main();