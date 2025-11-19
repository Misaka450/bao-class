import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const initRoute = new Hono<{ Bindings: Bindings }>()

// Initialize database with test data
initRoute.post('/init', async (c) => {
    try {
        const db = c.env.DB

        // Clear existing data in correct order
        await db.prepare("DELETE FROM scores").run()
        await db.prepare("DELETE FROM exams").run()
        await db.prepare("DELETE FROM students").run()
        await db.prepare("DELETE FROM courses").run()
        await db.prepare("DELETE FROM classes").run()

        // Insert classes and get IDs
        await db.prepare("INSERT INTO classes (name, grade) VALUES ('一年级1班', 1)").run()
        await db.prepare("INSERT INTO classes (name, grade) VALUES ('一年级2班', 1)").run()
        await db.prepare("INSERT INTO classes (name, grade) VALUES ('二年级1班', 2)").run()
        await db.prepare("INSERT INTO classes (name, grade) VALUES ('二年级2班', 2)").run()
        await db.prepare("INSERT INTO classes (name, grade) VALUES ('三年级1班', 3)").run()

        const classes = await db.prepare("SELECT id, name FROM classes ORDER BY id").all()
        const classIds = classes.results.map((c: any) => c.id)

        // Insert courses and get IDs
        await db.prepare("INSERT INTO courses (name, grade) VALUES ('语文', 1)").run()
        await db.prepare("INSERT INTO courses (name, grade) VALUES ('数学', 1)").run()
        await db.prepare("INSERT INTO courses (name, grade) VALUES ('英语', 1)").run()
        await db.prepare("INSERT INTO courses (name, grade) VALUES ('科学', 1)").run()
        await db.prepare("INSERT INTO courses (name, grade) VALUES ('体育', 1)").run()

        const courses = await db.prepare("SELECT id, name FROM courses ORDER BY id").all()
        const courseIds = courses.results.map((c: any) => c.id)

        // Insert students using actual class IDs
        const students = [
            ['张三', 'S1001', classIds[0]], ['李四', 'S1002', classIds[0]], ['王五', 'S1003', classIds[0]],
            ['赵六', 'S1004', classIds[0]], ['钱七', 'S1005', classIds[0]], ['孙八', 'S1006', classIds[0]],
            ['周九', 'S1007', classIds[1]], ['吴十', 'S1008', classIds[1]],
            ['郑十一', 'S1009', classIds[1]], ['王十二', 'S1010', classIds[1]],
            ['陈一', 'S2001', classIds[2]], ['林二', 'S2002', classIds[2]],
            ['黄三', 'S2003', classIds[2]], ['刘四', 'S2004', classIds[2]], ['杨五', 'S2005', classIds[2]]
        ]
        for (const [name, sid, cid] of students) {
            await db.prepare("INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)").bind(name, sid, cid).run()
        }

        const studentsList = await db.prepare("SELECT id FROM students ORDER BY id").all()
        const studentIds = studentsList.results.map((s: any) => s.id)

        // Insert exams using actual course and class IDs
        const exams = [
            ['期中考试', courseIds[0], classIds[0], '2024-11-10', 100],
            ['期末考试', courseIds[0], classIds[0], '2024-12-20', 100],
            ['期中考试', courseIds[1], classIds[0], '2024-11-12', 100],
            ['期末考试', courseIds[1], classIds[0], '2024-12-22', 100],
            ['期中考试', courseIds[2], classIds[0], '2024-11-14', 100],
            ['期中考试', courseIds[0], classIds[1], '2024-11-10', 100],
            ['期中考试', courseIds[1], classIds[1], '2024-11-12', 100],
            ['期中考试', courseIds[0], classIds[2], '2024-11-11', 100],
            ['期中考试', courseIds[1], classIds[2], '2024-11-13', 100]
        ]
        for (const [name, cid, clsid, date, score] of exams) {
            await db.prepare("INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES (?, ?, ?, ?, ?)").bind(name, cid, clsid, date, score).run()
        }

        const examsList = await db.prepare("SELECT id FROM exams ORDER BY id").all()
        const examIds = examsList.results.map((e: any) => e.id)

        // Insert scores using actual student and exam IDs
        const scores = [
            [studentIds[0], examIds[0], 92], [studentIds[1], examIds[0], 88], [studentIds[2], examIds[0], 95],
            [studentIds[3], examIds[0], 78], [studentIds[4], examIds[0], 85], [studentIds[5], examIds[0], 90],
            [studentIds[0], examIds[2], 88], [studentIds[1], examIds[2], 95], [studentIds[2], examIds[2], 82],
            [studentIds[3], examIds[2], 76], [studentIds[4], examIds[2], 91], [studentIds[5], examIds[2], 87],
            [studentIds[0], examIds[4], 85], [studentIds[1], examIds[4], 90], [studentIds[2], examIds[4], 88],
            [studentIds[3], examIds[4], 72], [studentIds[4], examIds[4], 83], [studentIds[5], examIds[4], 86],
            [studentIds[0], examIds[1], 94], [studentIds[1], examIds[1], 91], [studentIds[2], examIds[1], 97],
            [studentIds[3], examIds[1], 81], [studentIds[4], examIds[1], 88], [studentIds[5], examIds[1], 92],
            [studentIds[0], examIds[3], 90], [studentIds[1], examIds[3], 96], [studentIds[2], examIds[3], 85],
            [studentIds[3], examIds[3], 79], [studentIds[4], examIds[3], 93], [studentIds[5], examIds[3], 89],
            [studentIds[6], examIds[5], 86], [studentIds[7], examIds[5], 92],
            [studentIds[8], examIds[5], 89], [studentIds[9], examIds[5], 84],
            [studentIds[6], examIds[6], 91], [studentIds[7], examIds[6], 88],
            [studentIds[8], examIds[6], 85], [studentIds[9], examIds[6], 90],
            [studentIds[10], examIds[7], 93], [studentIds[11], examIds[7], 87],
            [studentIds[12], examIds[7], 90], [studentIds[13], examIds[7], 82], [studentIds[14], examIds[7], 89],
            [studentIds[10], examIds[8], 88], [studentIds[11], examIds[8], 94],
            [studentIds[12], examIds[8], 86], [studentIds[13], examIds[8], 79], [studentIds[14], examIds[8], 91]
        ]
        for (const [sid, eid, score] of scores) {
            await db.prepare("INSERT INTO scores (student_id, exam_id, score) VALUES (?, ?, ?)").bind(sid, eid, score).run()
        }

        const counts = await db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM classes) as classes,
                (SELECT COUNT(*) FROM students) as students,
                (SELECT COUNT(*) FROM courses) as courses,
                (SELECT COUNT(*) FROM exams) as exams,
                (SELECT COUNT(*) FROM scores) as scores
        `).first()

        return c.json({
            message: '数据初始化成功！',
            success: true,
            counts
        })
    } catch (error) {
        console.error('Init error:', error)
        return c.json({ error: '初始化失败: ' + (error instanceof Error ? error.message : '未知错误') }, 500)
    }
})

export default initRoute
