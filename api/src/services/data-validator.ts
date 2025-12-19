import type { D1Database } from '@cloudflare/workers-types'

// 验证结果类型
export interface ValidationResult {
    valid: number
    invalid: number
    warnings: ValidationWarning[]
    fixedData: any[]
}

export interface ValidationWarning {
    row: number
    field?: string
    message: string
    level: 'error' | 'warning'
    fixed: boolean
    before?: any
    after?: any
    value?: any
}

// 学生数据验证
export async function validateStudentsData(
    data: Array<{ '姓名': string; '班级': string; '性别'?: string }>,
    db: D1Database
): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = []
    const fixedData: any[] = []
    let validCount = 0
    let invalidCount = 0

    // 预加载班级数据
    const classesResult = await db.prepare('SELECT id, name FROM classes').all()
    const classMap = new Map<string, number>()
    const classNames = new Set<string>()

    classesResult.results.forEach((row: any) => {
        classMap.set(row.name, row.id)
        classNames.add(row.name)
        // 添加简化版本（去除"年级"、"班"）
        const simplified = row.name.replace(/年级|班/g, '')
        if (simplified !== row.name) {
            classMap.set(simplified, row.id)
        }
    })

    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 2 // Excel行号（从2开始）
        let fixedRow = { ...row }
        let hasError = false

        // 1. 验证和修复姓名
        if (!row['姓名']) {
            warnings.push({
                row: rowNum,
                field: '姓名',
                message: '姓名为必填项',
                level: 'error',
                fixed: false
            })
            hasError = true
        } else {
            const originalName = row['姓名']
            let fixedName = originalName.trim()

            // 去除中间多余空格
            fixedName = fixedName.replace(/\s+/g, ' ')

            // 检测异常字符
            if (/[^\u4e00-\u9fa5a-zA-Z\s·]/.test(fixedName)) {
                warnings.push({
                    row: rowNum,
                    field: '姓名',
                    message: '姓名包含异常字符',
                    level: 'warning',
                    fixed: false,
                    value: fixedName
                })
            }

            if (fixedName !== originalName) {
                warnings.push({
                    row: rowNum,
                    field: '姓名',
                    message: '已自动清理姓名中的空格',
                    level: 'warning',
                    fixed: true,
                    before: originalName,
                    after: fixedName
                })
            }

            fixedRow['姓名'] = fixedName
        }

        // 2. 验证和修复班级
        if (!row['班级']) {
            warnings.push({
                row: rowNum,
                field: '班级',
                message: '班级为必填项',
                level: 'error',
                fixed: false
            })
            hasError = true
        } else {
            const originalClass = row['班级'].trim()
            let classId = classMap.get(originalClass)

            if (!classId) {
                // 尝试模糊匹配
                const simplified = originalClass.replace(/年级|班/g, '')
                classId = classMap.get(simplified)

                if (classId) {
                    // 找到模糊匹配
                    const correctName = Array.from(classNames).find(name =>
                        classMap.get(name) === classId
                    )
                    warnings.push({
                        row: rowNum,
                        field: '班级',
                        message: `班级名称已自动修正`,
                        level: 'warning',
                        fixed: true,
                        before: originalClass,
                        after: correctName
                    })
                    fixedRow['班级'] = correctName || originalClass;
                } else {
                    // 未找到匹配
                    warnings.push({
                        row: rowNum,
                        field: '班级',
                        message: `班级不存在`,
                        level: 'error',
                        fixed: false,
                        value: originalClass
                    })
                    hasError = true
                }
            } else if (originalClass !== row['班级']) {
                fixedRow['班级'] = originalClass
            }
        }

        // 3. 验证和修复性别
        if (row['性别']) {
            const originalGender = row['性别'].trim()
            let standardGender: string | null = null

            // 标准化性别
            const maleVariants = ['男', 'male', 'm', 'M', 'Male', 'MALE']
            const femaleVariants = ['女', 'female', 'f', 'F', 'Female', 'FEMALE']

            if (maleVariants.includes(originalGender)) {
                standardGender = '男'
            } else if (femaleVariants.includes(originalGender)) {
                standardGender = '女'
            } else {
                warnings.push({
                    row: rowNum,
                    field: '性别',
                    message: '性别格式错误，应为"男"或"女"',
                    level: 'warning',
                    fixed: false,
                    value: originalGender
                })
            }

            if (standardGender && standardGender !== originalGender) {
                warnings.push({
                    row: rowNum,
                    field: '性别',
                    message: '性别已标准化',
                    level: 'warning',
                    fixed: true,
                    before: originalGender,
                    after: standardGender
                })
                fixedRow['性别'] = standardGender
            } else if (standardGender) {
                fixedRow['性别'] = standardGender
            }
        }

        if (hasError) {
            invalidCount++
        } else {
            validCount++
        }

        fixedData.push(fixedRow)
    }

    return {
        valid: validCount,
        invalid: invalidCount,
        warnings,
        fixedData
    }
}

// 成绩数据验证
export async function validateScoresData(
    data: Array<Record<string, any>>,
    examId: number,
    db: D1Database
): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = []
    const fixedData: any[] = []
    let validCount = 0
    let invalidCount = 0

    // 预加载考试信息
    const examInfo = await db.prepare('SELECT class_id FROM exams WHERE id = ?').bind(examId).first()
    if (!examInfo) {
        throw new Error('考试不存在')
    }
    const classId = examInfo.class_id as number

    // 预加载学生数据
    const studentsResult = await db.prepare(`
        SELECT id, student_id, name FROM students WHERE class_id = ?
    `).bind(classId).all()

    const studentMapById = new Map<string, any>()
    const studentMapByName = new Map<string, any>()
    studentsResult.results.forEach((s: any) => {
        studentMapById.set(s.student_id, s)
        studentMapByName.set(s.name, s)
    })

    // 预加载有效科目
    const validCoursesResult = await db.prepare(`
        SELECT c.name FROM courses c
        JOIN exam_courses ec ON c.id = ec.course_id
        WHERE ec.exam_id = ?
    `).bind(examId).all()
    const validCourses = new Set(validCoursesResult.results.map((r: any) => r.name))

    // 分析数据格式
    if (data.length === 0) {
        return { valid: 0, invalid: 0, warnings: [], fixedData: [] }
    }

    const firstRow = data[0]
    const courseColumns = Object.keys(firstRow).filter(
        key => key !== '姓名' && key !== '学号' && validCourses.has(key)
    )

    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 2
        let hasError = false
        const fixedRow = { ...row }

        // 1. 验证学生
        const studentName = row['姓名']?.trim()
        const studentId = row['学号']?.trim()

        if (!studentName) {
            warnings.push({
                row: rowNum,
                field: '姓名',
                message: '姓名为必填项',
                level: 'error',
                fixed: false
            })
            hasError = true
        } else {
            // 查找学生
            let student = null
            if (studentId && studentMapById.has(studentId)) {
                student = studentMapById.get(studentId)
            } else if (studentMapByName.has(studentName)) {
                student = studentMapByName.get(studentName)
                if (!studentId) {
                    warnings.push({
                        row: rowNum,
                        field: '学号',
                        message: '已自动匹配学号',
                        level: 'warning',
                        fixed: true,
                        after: student.student_id
                    })
                    fixedRow['学号'] = student.student_id
                }
            } else {
                warnings.push({
                    row: rowNum,
                    field: '姓名',
                    message: `找不到学生`,
                    level: 'error',
                    fixed: false,
                    value: `${studentName}${studentId ? ` (${studentId})` : ''}`
                })
                hasError = true
            }
        }

        // 2. 验证分数
        for (const course of courseColumns) {
            const rawScore = row[course]
            if (rawScore === undefined || rawScore === null || rawScore === '') {
                continue // 允许空分数
            }

            const score = parseFloat(rawScore)
            if (isNaN(score)) {
                warnings.push({
                    row: rowNum,
                    field: course,
                    message: '分数格式错误',
                    level: 'error',
                    fixed: false,
                    value: rawScore
                })
                hasError = true
            } else if (score < 0 || score > 150) {
                warnings.push({
                    row: rowNum,
                    field: course,
                    message: '分数超出范围（0-150）',
                    level: 'error',
                    fixed: false,
                    value: score
                })
                hasError = true
            } else {
                // 限制小数位
                const fixedScore = Math.round(score * 10) / 10
                if (fixedScore !== score) {
                    warnings.push({
                        row: rowNum,
                        field: course,
                        message: '分数已保留1位小数',
                        level: 'warning',
                        fixed: true,
                        before: score,
                        after: fixedScore
                    })
                    fixedRow[course] = fixedScore
                }
            }
        }

        if (hasError) {
            invalidCount++
        } else {
            validCount++
        }

        fixedData.push(fixedRow)
    }

    return {
        valid: validCount,
        invalid: invalidCount,
        warnings,
        fixedData
    }
}
