// Test script to verify Qwen model fix
const API_BASE_URL = 'https://api.980823.xyz';

async function testGenerateComment() {
    try {
        console.log('Testing AI comment generation with Qwen model...');
        
        // 使用实际存在的学生ID进行测试
        const response = await fetch(`${API_BASE_URL}/api/ai/generate-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 注意：在实际测试中，你需要提供有效的认证信息
                // 这里只是一个示例
            },
            body: JSON.stringify({
                student_id: 1, // 替换为实际的学生ID
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

// Run the test
testGenerateComment();