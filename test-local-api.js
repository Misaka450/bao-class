const axios = require('axios');

async function testLocalAPI() {
  try {
    console.log('Testing local API health check...');
    
    // 测试根路径
    const healthResponse = await axios.get('http://127.0.0.1:8787/');
    console.log('Health check:', healthResponse.data);
    
    console.log('Testing local login with admin/admin123...');
    
    // 测试登录
    const loginResponse = await axios.post('http://127.0.0.1:8787/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('Local login successful!');
    console.log('Response:', loginResponse.data);
    
    return loginResponse.data;
  } catch (error) {
    console.error('Local API test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

testLocalAPI();