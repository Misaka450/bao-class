import { JWTPayload } from '../types'

/**
 * 获取当前用户有权访问的班级 ID 列表
 * @returns 'ALL' 表示管理员，或者 ID 数组
 */
export async function getAuthorizedClassIds(db: D1Database, user: JWTPayload): Promise<number[] | 'ALL'> {
    if (user.role === 'admin') return 'ALL'

    const classIds = new Set<number>()

    // 1. 获取作为班主任管理的班级
    const headTeacherClasses = await db.prepare('SELECT id FROM classes WHERE teacher_id = ?').bind(user.userId).all()
    headTeacherClasses.results.forEach(r => classIds.add(r.id as number))

    // 2. 获取作为任课老师授课的班级
    const subjectTeacherClasses = await db.prepare('SELECT class_id FROM class_course_teachers WHERE teacher_id = ?').bind(user.userId).all()
    subjectTeacherClasses.results.forEach(r => classIds.add(r.class_id as number))

    return Array.from(classIds)
}

/**
 * 获取当前用户有权访问的课程 ID 列表
 * @returns 'ALL' 表示管理员，或者 ID 数组
 */
export async function getAuthorizedCourseIds(db: D1Database, user: JWTPayload): Promise<number[] | 'ALL'> {
    if (user.role === 'admin') return 'ALL'

    const courseIds = new Set<number>()

    // 1. 获取作为任课老师授课的课程
    const subjectTeacherCourses = await db.prepare('SELECT course_id FROM class_course_teachers WHERE teacher_id = ?').bind(user.userId).all()
    subjectTeacherCourses.results.forEach(r => courseIds.add(r.course_id as number))

    return Array.from(courseIds)
}

/**
 * 校验用户是否对指定班级有操作权限
 */
export async function checkClassAccess(db: D1Database, user: JWTPayload, classId: number): Promise<boolean> {
    if (user.role === 'admin') return true

    const authorized = await getAuthorizedClassIds(db, user)
    if (authorized === 'ALL') return true

    return authorized.includes(Number(classId))
}

/**
 * 校验用户是否对指定班级的指定科目有录入/修改权限
 */
export async function checkCourseAccess(db: D1Database, user: JWTPayload, classId: number, courseId: number): Promise<boolean> {
    if (user.role === 'admin') return true

    // 1. 检查是否是该班班主任
    const isHeadTeacher = await db.prepare('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?').bind(classId, user.userId).first()
    if (isHeadTeacher) return true

    // 2. 检查是否是该科目的任课老师
    const isSubjectTeacher = await db.prepare('SELECT 1 FROM class_course_teachers WHERE class_id = ? AND course_id = ? AND teacher_id = ?').bind(classId, courseId, user.userId).first()
    if (isSubjectTeacher) return true

    return false
}

