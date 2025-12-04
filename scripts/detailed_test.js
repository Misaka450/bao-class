// Detailed test script to check the entire AI comment generation flow
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

async function getStudents(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        // Students API doesn't use standard response format
        if (Array.isArray(data)) {
            console.log('✅ Students fetched successfully!');
            return data;
        } else {
            console.error('❌ Failed to fetch students:', data);
            return null;
        }
    } catch (error) {
        console.error('Get students error:', error);
        return null;
    }
}

async function testGenerateComment(token, studentId) {
    try {
        console.log(`Testing AI comment generation for student ID: ${studentId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/ai/generate-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: studentId,
                exam_ids: [],
                force_regenerate: true
            })
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('✅ Comment generated successfully!');
            console.log('Comment length:', data.comment.length);
            console.log('Comment preview:', data.comment.substring(0, 100) + '...');
        } else {
            console.log('❌ Failed to generate comment');
        }
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

async function main() {
    console.log('Starting detailed test with authentication...');
    
    // 1. Login to get token
    const token = await login();
    
    if (token) {
        // 2. Get students
        const students = await getStudents(token);
        
        if (students && students.length > 0) {
            // 3. Test AI comment generation with the first student
            await testGenerateComment(token, students[0].id);
        } else {
            console.log('No students found');
        }
    } else {
        console.log('Cannot proceed without authentication token');
    }
}

// Run the test
main();