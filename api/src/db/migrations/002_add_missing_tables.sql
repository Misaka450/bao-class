-- Class Course Teachers (任课老师关联表)
-- 用于记录某位老师在某个班级教授某门课程
CREATE TABLE IF NOT EXISTS class_course_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(class_id, course_id, teacher_id)
);

-- AI Class Reports (AI 学情诊断报告缓存表)
-- 用于缓存 AI 生成的班级考试分析报告
CREATE TABLE IF NOT EXISTS ai_class_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    exam_id INTEGER NOT NULL,
    report_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    UNIQUE(class_id, exam_id)
);

-- 索引，优化查询性能
CREATE INDEX IF NOT EXISTS idx_cct_teacher ON class_course_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cct_class_course ON class_course_teachers(class_id, course_id);
