// Script to test and fix AI response parsing - Version 2
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

async function testAIPrompt(token) {
    try {
        console.log('Testing AI prompt optimization...');
        
        // 构造一个模拟的AI请求，直接调用debug接口
        const response = await fetch(`${API_BASE_URL}/api/debug/test-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: "@cf/qwen/qwen3-30b-a3b-fp8",
                // 增加max_tokens并优化提示词
                max_tokens: 500,
                prompt: `ROLE: 你是一位经验丰富、富有爱心的小学班主任。

TASK: 请根据以下学生信息，撰写一段150字左右的期末评语。

STUDENT INFO:
姓名：张乔俊一
班级：三年级3班
平均分：70分
成绩趋势：显著退步（最近比初期下降了9分）
优势科目：数学、语文
薄弱科目：语文、英语
考试记录：期中考试 数学83分 语文68分 英语59分

WRITING REQUIREMENTS:
1. 语气温和、诚恳，多用鼓励性语言
2. 客观评价学习情况，既要肯定成绩和进步，也要委婉指出不足
3. 结合具体的优势科目和薄弱科目提出建设性的建议
4. 评语结构清晰，逻辑通顺
5. 只返回评语内容，不要包含任何解释、思考过程或额外信息
6. 必须以"张乔俊一同学："开头
7. 严禁以"好的"、"我需要"、"首先"、"用户"等词语开头
8. 直接输出以"张乔俊一同学："开头的评语内容，不要有任何前缀
9. 输出完成后立即停止，不要添加任何额外说明

OUTPUT FORMAT:
张乔俊一同学：[评语内容]`
            })
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        if (data.success && data.response) {
            // 解析AI响应
            let comment = '';
            
            if (data.response.choices && data.response.choices.length > 0) {
                const choice = data.response.choices[0];
                
                // 优先使用content字段
                if (choice.message && choice.message.content) {
                    comment = choice.message.content;
                    console.log('Using content field');
                }
                // 如果content为空或不存在，尝试reasoning_content
                else if (choice.message && choice.message.reasoning_content) {
                    comment = choice.message.reasoning_content;
                    console.log('Using reasoning_content field');
                }
            }
            
            // 清理评语内容
            comment = comment.trim();
            // 移除markdown代码块
            comment = comment.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '');
            
            // 检查是否以正确的方式开头
            if (comment.startsWith('张乔俊一同学：')) {
                console.log('✅ Generated comment:');
                console.log(comment);
                console.log('\nComment length:', comment.length);
                
                // 提取纯评语内容（去掉开头的"张乔俊一同学："）
                const pureComment = comment.substring('张乔俊一同学：'.length).trim();
                console.log('\nPure comment content:');
                console.log(pureComment);
            } else {
                console.log('❌ Comment does not start correctly:');
                console.log(comment);
                
                // 尝试提取以"张乔俊一同学："开头的部分
                const startIndex = comment.indexOf('张乔俊一同学：');
                if (startIndex !== -1) {
                    const extracted = comment.substring(startIndex);
                    console.log('\nExtracted comment:');
                    console.log(extracted);
                }
            }
        } else {
            console.log('❌ Failed to generate comment');
        }
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

async function main() {
    console.log('Starting AI prompt optimization test v2...');
    
    // 1. Login to get token
    const token = await login();
    
    if (token) {
        // 2. Test AI prompt
        await testAIPrompt(token);
    } else {
        console.log('Cannot proceed without authentication token');
    }
}

// Run the test
main();