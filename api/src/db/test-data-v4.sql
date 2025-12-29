-- 正确的测试数据（符合新 schema 设计）
-- 班级数据
INSERT INTO classes (name, grade) VALUES ('一年级1班', 1);
INSERT INTO classes (name, grade) VALUES ('一年级2班', 1);
INSERT INTO classes (name, grade) VALUES ('二年级1班', 2);
INSERT INTO classes (name, grade) VALUES ('二年级2班', 2);
INSERT INTO classes (name, grade) VALUES ('三年级1班', 3);

-- 课程数据
INSERT INTO courses (name, grade) VALUES ('语文', 1);
INSERT INTO courses (name, grade) VALUES ('数学', 1);
INSERT INTO courses (name, grade) VALUES ('英语', 1);
INSERT INTO courses (name, grade) VALUES ('科学', 1);
INSERT INTO courses (name, grade) VALUES ('体育', 1);

-- 学生数据（一年级1班）
INSERT INTO students (name, student_id, class_id) VALUES ('张三', 'S1001', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('李四', 'S1002', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('王五', 'S1003', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('赵六', 'S1004', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('钱七', 'S1005', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('孙八', 'S1006', 1);

-- 学生数据（一年级2班）
INSERT INTO students (name, student_id, class_id) VALUES ('周九', 'S1007', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('吴十', 'S1008', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('郑十一', 'S1009', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('王十二', 'S1010', 2);

-- 学生数据（二年级1班）
INSERT INTO students (name, student_id, class_id) VALUES ('陈一', 'S2001', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('林二', 'S2002', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('黄三', 'S2003', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('刘四', 'S2004', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('杨五', 'S2005', 3);

-- 考试数据（新 schema：不含 course_id 和 full_score）
-- 一年级1班的考试
INSERT INTO exams (name, class_id, exam_date, description) VALUES ('期中考试', 1, '2024-11-10', '一年级1班期中考试');
INSERT INTO exams (name, class_id, exam_date, description) VALUES ('期末考试', 1, '2024-12-20', '一年级1班期末考试');

-- 一年级2班的考试
INSERT INTO exams (name, class_id, exam_date, description) VALUES ('期中考试', 2, '2024-11-10', '一年级2班期中考试');

-- 二年级1班的考试
INSERT INTO exams (name, class_id, exam_date, description) VALUES ('期中考试', 3, '2024-11-11', '二年级1班期中考试');

-- 考试-科目关联（新 schema：使用 exam_courses 表）
-- 期中考试（一年级1班）- 包含语文、数学、英语
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (1, 1, 100); -- 语文
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (1, 2, 100); -- 数学
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (1, 3, 100); -- 英语

-- 期末考试（一年级1班）- 包含语文、数学、英语
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (2, 1, 100); -- 语文
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (2, 2, 100); -- 数学
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (2, 3, 100); -- 英语

-- 期中考试（一年级2班）- 包含语文、数学
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (3, 1, 100); -- 语文
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (3, 2, 100); -- 数学

-- 期中考试（二年级1班）- 包含语文、数学
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (4, 1, 100); -- 语文
INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (4, 2, 100); -- 数学

-- 成绩数据（新 schema：包含 course_id）
-- 一年级1班 - 期中考试 - 语文
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 1, 1, 92);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 1, 1, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 1, 1, 95);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 1, 1, 78);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 1, 1, 85);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 1, 1, 90);

-- 一年级1班 - 期中考试 - 数学
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 1, 2, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 1, 2, 95);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 1, 2, 82);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 1, 2, 76);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 1, 2, 91);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 1, 2, 87);

-- 一年级1班 - 期中考试 - 英语
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 1, 3, 85);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 1, 3, 90);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 1, 3, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 1, 3, 72);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 1, 3, 83);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 1, 3, 86);

-- 一年级1班 - 期末考试 - 语文
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 2, 1, 94);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 2, 1, 91);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 2, 1, 97);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 2, 1, 81);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 2, 1, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 2, 1, 92);

-- 一年级1班 - 期末考试 - 数学
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 2, 2, 90);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 2, 2, 96);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 2, 2, 85);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 2, 2, 79);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 2, 2, 93);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 2, 2, 89);

-- 一年级1班 - 期末考试 - 英语
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (1, 2, 3, 87);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (2, 2, 3, 93);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (3, 2, 3, 90);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (4, 2, 3, 75);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (5, 2, 3, 86);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (6, 2, 3, 88);

-- 一年级2班 - 期中考试 - 语文
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (7, 3, 1, 86);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (8, 3, 1, 92);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (9, 3, 1, 89);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (10, 3, 1, 84);

-- 一年级2班 - 期中考试 - 数学
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (7, 3, 2, 91);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (8, 3, 2, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (9, 3, 2, 85);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (10, 3, 2, 90);

-- 二年级1班 - 期中考试 - 语文
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (11, 4, 1, 93);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (12, 4, 1, 87);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (13, 4, 1, 90);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (14, 4, 1, 82);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (15, 4, 1, 89);

-- 二年级1班 - 期中考试 - 数学
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (11, 4, 2, 88);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (12, 4, 2, 94);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (13, 4, 2, 86);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (14, 4, 2, 79);
INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (15, 4, 2, 91);
