const fetch = require('node-fetch');

const API_URL = 'http://localhost:8787/api';
const TOKEN = ''; // We might need to login first, but let's assume we can use a hardcoded token or just login in the script.

async function seedData() {
    console.log('Starting data seed...');

    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const { token } = await loginRes.json();
    console.log('Login successful, token obtained.');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Create Class
    console.log('Creating Class...');
    const classRes = await fetch(`${API_URL}/classes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: '三年二班', grade: 3 })
    });
    const classData = await classRes.json();
    const classId = classData.id || (await (await fetch(`${API_URL}/classes`, { headers })).json())[0].id;
    console.log('Class ID:', classId);

    // 3. Create Course
    console.log('Creating Course...');
    const courseRes = await fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: '数学' })
    });
    // If course exists, it might fail or return existing. Let's fetch if fail.
    let courseId;
    if (courseRes.ok) {
        const courseData = await courseRes.json();
        courseId = courseData.id;
    } else {
        const courses = await (await fetch(`${API_URL}/courses`, { headers })).json();
        courseId = courses.find(c => c.name === '数学')?.id;
    }
    console.log('Course ID:', courseId);

    // 4. Create Students
    console.log('Creating Students...');
    const studentNames = ['张三', '李四', '王五', '赵六', '孙七'];
    const studentIds = [];

    for (let i = 0; i < studentNames.length; i++) {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: studentNames[i],
                student_id: `20230${i + 1}`,
                class_id: classId
            })
        });
        if (res.ok) {
            const data = await res.json();
            studentIds.push(data.id);
        } else {
            // Try to find existing
            const students = await (await fetch(`${API_URL}/students?classId=${classId}`, { headers })).json();
            const student = students.find(s => s.student_id === `20230${i + 1}`);
            if (student) studentIds.push(student.id);
        }
    }
    console.log('Student IDs:', studentIds);

    // 5. Create Exams (Previous and Current)
    console.log('Creating Exams...');

    // Previous Exam (Last Month)
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevExamRes = await fetch(`${API_URL}/exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: '第一次月考',
            exam_date: prevDate.toISOString().split('T')[0],
            class_id: classId,
            course_ids: [courseId]
        })
    });
    const prevExamData = await prevExamRes.json();
    const prevExamId = prevExamData.id; // Note: API might return ID differently, check response if needed.

    // Current Exam (Today)
    const currDate = new Date();
    const currExamRes = await fetch(`${API_URL}/exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: '期中考试',
            exam_date: currDate.toISOString().split('T')[0],
            class_id: classId,
            course_ids: [courseId]
        })
    });
    const currExamData = await currExamRes.json();
    const currExamId = currExamData.id;

    console.log('Exams created:', prevExamId, currExamId);

    // 6. Add Scores
    console.log('Adding Scores...');

    // Scores: 
    // Student 0: Improved (60 -> 90)
    // Student 1: Declined (90 -> 60)
    // Student 2: Improved (70 -> 85)
    // Student 3: Declined (85 -> 70)
    // Student 4: Stable (80 -> 80)

    const scores = [
        { studentIdx: 0, prev: 60, curr: 90 },
        { studentIdx: 1, prev: 90, curr: 60 },
        { studentIdx: 2, prev: 70, curr: 85 },
        { studentIdx: 3, prev: 85, curr: 70 },
        { studentIdx: 4, prev: 80, curr: 80 },
    ];

    for (const s of scores) {
        const studentId = studentIds[s.studentIdx];
        if (!studentId) continue;

        // Previous Exam Score
        await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                exam_id: prevExamId,
                course_id: courseId,
                student_id: studentId,
                score: s.prev
            })
        });

        // Current Exam Score
        await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                exam_id: currExamId,
                course_id: courseId,
                student_id: studentId,
                score: s.curr
            })
        });
    }

    console.log('Data seed completed successfully!');
}

seedData().catch(console.error);
