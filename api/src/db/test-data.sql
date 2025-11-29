-- 插入测试用户（密码已通过注册接口创建，这里仅作参考）
-- admin / baobao123
-- teacher / teacher123

-- 插入测试班级
INSERT INTO classes (name, grade_level) VALUES 
('一年级1班', '一年级'),
('一年级2班', '一年级'),
('二年级1班', '二年级'),
('二年级2班', '二年级'),
('三年级1班', '三年级');

-- 插入测试课程
INSERT INTO courses (name, description) VALUES 
('语文', '小学语文课程'),
('数学', '小学数学课程'),
('英语', '小学英语课程'),
('科学', '小学科学课程'),
('体育', '小学体育课程');

-- 插入测试学生 (一年级1班)
INSERT INTO students (name, student_id, class_id) VALUES 
('张三', 'S1001', 1),
('李四', 'S1002', 1),
('王五', 'S1003', 1),
('赵六', 'S1004', 1),
('钱七', 'S1005', 1),
('孙八', 'S1006', 1);

-- 插入测试学生 (一年级2班)
INSERT INTO students (name, student_id, class_id) VALUES 
('周九', 'S1007', 2),
('吴十', 'S1008', 2),
('郑十一', 'S1009', 2),
('王十二', 'S1010', 2);

-- 插入测试学生 (二年级1班)
INSERT INTO students (name, student_id, class_id) VALUES 
('陈一', 'S2001', 3),
('林二', 'S2002', 3),
('黄三', 'S2003', 3),
('刘四', 'S2004', 3),
('杨五', 'S2005', 3);

-- 插入测试考试 (语文 - 一年级1班)
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES 
('语文期中考试', 1, 1, '2024-11-10', 100),
('语文期末考试', 1, 1, '2024-12-20', 100);

-- 插入测试考试 (数学 - 一年级1班)
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES 
('数学期中考试', 2, 1, '2024-11-12', 100),
('数学期末考试', 2, 1, '2024-12-22', 100);

-- 插入测试考试 (英语 - 一年级1班)
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES 
('英语期中考试', 3, 1, '2024-11-14', 100);

-- 插入测试考试 (一年级2班)
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES 
('语文期中考试', 1, 2, '2024-11-10', 100),
('数学期中考试', 2, 2, '2024-11-12', 100);

-- 插入测试考试 (二年级1班)
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES 
('语文期中考试', 1, 3, '2024-11-11', 100),
('数学期中考试', 2, 3, '2024-11-13', 100);

-- 插入测试成绩 (语文期中 - 一年级1班)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(1, 1, 92),
(2, 1, 88),
(3, 1, 95),
(4, 1, 78),
(5, 1, 85),
(6, 1, 90);

-- 插入测试成绩 (数学期中 - 一年级1班)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(1, 3, 88),
(2, 3, 95),
(3, 3, 82),
(4, 3, 76),
(5, 3, 91),
(6, 3, 87);

-- 插入测试成绩 (英语期中 - 一年级1班)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(1, 5, 85),
(2, 5, 90),
(3, 5, 88),
(4, 5, 72),
(5, 5, 83),
(6, 5, 86);

-- 插入测试成绩 (语文期末 - 一年级1班)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(1, 2, 94),
(2, 2, 91),
(3, 2, 97),
(4, 2, 81),
(5, 2, 88),
(6, 2, 92);

-- 插入测试成绩 (数学期末 - 一年级1班)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(1, 4, 90),
(2, 4, 96),
(3, 4, 85),
(4, 4, 79),
(5, 4, 93),
(6, 4, 89);

-- 插入测试成绩 (一年级2班 - 语文期中)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(7, 6, 86),
(8, 6, 92),
(9, 6, 89),
(10, 6, 84);

-- 插入测试成绩 (一年级2班 - 数学期中)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(7, 7, 91),
(8, 7, 88),
(9, 7, 85),
(10, 7, 90);

-- 插入测试成绩 (二年级1班 - 语文期中)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(11, 8, 93),
(12, 8, 87),
(13, 8, 90),
(14, 8, 82),
(15, 8, 89);

-- 插入测试成绩 (二年级1班 - 数学期中)
INSERT INTO scores (student_id, exam_id, score) VALUES 
(11, 9, 88),
(12, 9, 94),
(13, 9, 86),
(14, 9, 79),
(15, 9, 91);
