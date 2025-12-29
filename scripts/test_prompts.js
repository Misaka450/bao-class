// Script to test different AI prompts
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

async function testPrompt(token, promptName, prompt) {
    try {
        console.log(`\n--- Testing ${promptName} ---`);
        
        // 构造一个模拟的AI请求，直接调用debug接口
        const response = await fetch(`${API_BASE_URL}/api/debug/test-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: "@cf/qwen/qwen3-30b-a3b-fp8",
                max_tokens: 600,
                prompt: prompt
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.response) {
            // 解析AI响应
            let comment = '';
            let usingField = '';
            
            if (data.response.choices && data.response.choices.length > 0) {
                const choice = data.response.choices[0];
                
                // 优先使用content字段
                if (choice.message && choice.message.content) {
                    comment = choice.message.content;
                    usingField = 'content';
                }
                // 如果content为空或不存在，尝试reasoning_content
                else if (choice.message && choice.message.reasoning_content) {
                    comment = choice.message.reasoning_content;
                    usingField = 'reasoning_content';
                }
            }
            
            // 清理评语内容
            comment = comment.trim();
            
            // 检查是否以正确的方式开头
            if (comment.startsWith('张乔俊一同学：')) {
                console.log(`✅ Success using ${usingField} field:`);
                console.log(comment);
                console.log(`\nLength: ${comment.length}`);
                return true;
            } else {
                console.log(`❌ Failed using ${usingField} field:`);
                console.log(comment.substring(0, 100) + '...');
                return false;
            }
        } else {
            console.log('❌ Failed to generate comment');
            return false;
        }
    } catch (error) {
        console.error('Test failed with error:', error);
        return false;
    }
}

async function main() {
    console.log('Starting prompt testing...');
    
    // 1. Login to get token
    const token = await login();
    
    if (token) {
        // 测试不同的提示词
        const prompts = [
            {
                name: "Simple Prompt",
                prompt: `你是一位小学班主任，请为张乔俊一同学写一段150字左右的期末评语。他数学83分，语文68分，英语59分。请以"张乔俊一同学："开头。`
            },
            {
                name: "Structured Prompt",
                prompt: `ROLE: 小学班主任
STUDENT: 张乔俊一
GRADES: 数学83分，语文68分，英语59分
TASK: 写一段150字左右的期末评语
FORMAT: 必须以"张乔俊一同学："开头，直接输出评语内容`
            },
            {
                name: "Explicit Output Prompt",
                prompt: `请为以下学生写期末评语，直接输出结果，不要任何解释：

学生：张乔俊一
成绩：数学83分，语文68分，英语59分

输出：张乔俊一同学：[评语内容]`
            }
        ];
        
        let successCount = 0;
        for (const {name, prompt} of prompts) {
            const success = await testPrompt(token, name, prompt);
            if (success) successCount++;
        }
        
        console.log(`\n--- Summary ---`);
        console.log(`Successful prompts: ${successCount}/${prompts.length}`);
    } else {
        console.log('Cannot proceed without authentication token');
    }
}

// Run the test
main();