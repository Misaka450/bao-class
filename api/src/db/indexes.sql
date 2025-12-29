-- 数据库性能优化索引
-- 创建时间：2025-12-01
-- 用途：为高频查询添加索引，显著提升查询性能

-- ==========================================
-- 1. exams 表索引
-- ==========================================

-- 索引：按班级和日期查询考试（极高频）
-- 使用场景：获取班级的最新考试、考试列表排序
CREATE INDEX IF NOT EXISTS idx_exams_class_date ON exams(class_id, exam_date DESC);

-- 索引：按日期全局查询（中频）
-- 使用场景：获取全局最新考试
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date DESC);

-- ==========================================
-- 2. scores 表索引
-- ==========================================

-- 索引：按考试和学生查询成绩（极高频）
-- 使用场景：学生成绩查询、排名计算
CREATE INDEX IF NOT EXISTS idx_scores_exam_student ON scores(exam_id, student_id);

-- 索引：按学生和考试查询成绩（极高频）
-- 使用场景：学生历史成绩、档案查询
CREATE INDEX IF NOT EXISTS idx_scores_student_exam ON scores(student_id, exam_id);

-- 索引：按考试和科目查询（高频）
-- 使用场景：科目成绩统计、单科排名
CREATE INDEX IF NOT EXISTS idx_scores_exam_course ON scores(exam_id, course_id);

-- 复合索引：考试+学生+科目（唯一约束已存在，但添加索引提升性能）
-- 使用场景：成绩录入、更新
CREATE INDEX IF NOT EXISTS idx_scores_exam_student_course ON scores(exam_id, student_id, course_id);

-- ==========================================
-- 3. students 表索引
-- ==========================================

-- 索引：按班级查询学生（极高频）
-- 使用场景：班级学生列表、统计
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- 索引：学号查询（中频）
-- 使用场景：学生搜索
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- ==========================================
-- 4. exam_courses 表索引
-- ==========================================

-- 索引：按考试查询科目（高频）
-- 使用场景：获取考试的科目列表
CREATE INDEX IF NOT EXISTS idx_exam_courses_exam ON exam_courses(exam_id);

-- ==========================================
-- 5. classes 表索引
-- ==========================================

-- 索引：按年级查询班级（中频）
-- 使用场景：年级对比
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);

-- ==========================================
-- 性能提升预期
-- ==========================================
-- 1. 学生档案查询：50-80% 性能提升
-- 2. 班级成绩统计：60-90% 性能提升
-- 3. 排名计算：40-70% 性能提升
-- 4. 年级对比：70-90% 性能提升
