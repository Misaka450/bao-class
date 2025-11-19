INSERT INTO classes (name, grade_level) VALUES ('一年级1班', '一年级');
INSERT INTO classes (name, grade_level) VALUES ('一年级2班', '一年级');
INSERT INTO classes (name, grade_level) VALUES ('二年级1班', '二年级');
INSERT INTO classes (name, grade_level) VALUES ('二年级2班', '二年级');
INSERT INTO classes (name, grade_level) VALUES ('三年级1班', '三年级');

INSERT INTO courses (name, description) VALUES ('语文', '小学语文课程');
INSERT INTO courses (name, description) VALUES ('数学', '小学数学课程');
INSERT INTO courses (name, description) VALUES ('英语', '小学英语课程');
INSERT INTO courses (name, description) VALUES ('科学', '小学科学课程');
INSERT INTO courses (name, description) VALUES ('体育', '小学体育课程');

INSERT INTO students (name, student_id, class_id) VALUES ('张三', 'S1001', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('李四', 'S1002', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('王五', 'S1003', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('赵六', 'S1004', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('钱七', 'S1005', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('孙八', 'S1006', 1);
INSERT INTO students (name, student_id, class_id) VALUES ('周九', 'S1007', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('吴十', 'S1008', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('郑十一', 'S1009', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('王十二', 'S1010', 2);
INSERT INTO students (name, student_id, class_id) VALUES ('陈一', 'S2001', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('林二', 'S2002', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('黄三', 'S2003', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('刘四', 'S2004', 3);
INSERT INTO students (name, student_id, class_id) VALUES ('杨五', 'S2005', 3);

INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('语文期中考试', 1, 1, '2024-11-10', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('语文期末考试', 1, 1, '2024-12-20', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('数学期中考试', 2, 1, '2024-11-12', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('数学期末考试', 2, 1, '2024-12-22', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('英语期中考试', 3, 1, '2024-11-14', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('语文期中考试', 1, 2, '2024-11-10', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('数学期中考试', 2, 2, '2024-11-12', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('语文期中考试', 1, 3, '2024-11-11', 100);
INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES ('数学期中考试', 2, 3, '2024-11-13', 100);

INSERT INTO scores (student_id, exam_id, score) VALUES (1, 1, 92);
INSERT INTO scores (student_id, exam_id, score) VALUES (2, 1, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (3, 1, 95);
INSERT INTO scores (student_id, exam_id, score) VALUES (4, 1, 78);
INSERT INTO scores (student_id, exam_id, score) VALUES (5, 1, 85);
INSERT INTO scores (student_id, exam_id, score) VALUES (6, 1, 90);

INSERT INTO scores (student_id, exam_id, score) VALUES (1, 3, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (2, 3, 95);
INSERT INTO scores (student_id, exam_id, score) VALUES (3, 3, 82);
INSERT INTO scores (student_id, exam_id, score) VALUES (4, 3, 76);
INSERT INTO scores (student_id, exam_id, score) VALUES (5, 3, 91);
INSERT INTO scores (student_id, exam_id, score) VALUES (6, 3, 87);

INSERT INTO scores (student_id, exam_id, score) VALUES (1, 5, 85);
INSERT INTO scores (student_id, exam_id, score) VALUES (2, 5, 90);
INSERT INTO scores (student_id, exam_id, score) VALUES (3, 5, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (4, 5, 72);
INSERT INTO scores (student_id, exam_id, score) VALUES (5, 5, 83);
INSERT INTO scores (student_id, exam_id, score) VALUES (6, 5, 86);

INSERT INTO scores (student_id, exam_id, score) VALUES (1, 2, 94);
INSERT INTO scores (student_id, exam_id, score) VALUES (2, 2, 91);
INSERT INTO scores (student_id, exam_id, score) VALUES (3, 2, 97);
INSERT INTO scores (student_id, exam_id, score) VALUES (4, 2, 81);
INSERT INTO scores (student_id, exam_id, score) VALUES (5, 2, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (6, 2, 92);

INSERT INTO scores (student_id, exam_id, score) VALUES (1, 4, 90);
INSERT INTO scores (student_id, exam_id, score) VALUES (2, 4, 96);
INSERT INTO scores (student_id, exam_id, score) VALUES (3, 4, 85);
INSERT INTO scores (student_id, exam_id, score) VALUES (4, 4, 79);
INSERT INTO scores (student_id, exam_id, score) VALUES (5, 4, 93);
INSERT INTO scores (student_id, exam_id, score) VALUES (6, 4, 89);

INSERT INTO scores (student_id, exam_id, score) VALUES (7, 6, 86);
INSERT INTO scores (student_id, exam_id, score) VALUES (8, 6, 92);
INSERT INTO scores (student_id, exam_id, score) VALUES (9, 6, 89);
INSERT INTO scores (student_id, exam_id, score) VALUES (10, 6, 84);

INSERT INTO scores (student_id, exam_id, score) VALUES (7, 7, 91);
INSERT INTO scores (student_id, exam_id, score) VALUES (8, 7, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (9, 7, 85);
INSERT INTO scores (student_id, exam_id, score) VALUES (10, 7, 90);

INSERT INTO scores (student_id, exam_id, score) VALUES (11, 8, 93);
INSERT INTO scores (student_id, exam_id, score) VALUES (12, 8, 87);
INSERT INTO scores (student_id, exam_id, score) VALUES (13, 8, 90);
INSERT INTO scores (student_id, exam_id, score) VALUES (14, 8, 82);
INSERT INTO scores (student_id, exam_id, score) VALUES (15, 8, 89);

INSERT INTO scores (student_id, exam_id, score) VALUES (11, 9, 88);
INSERT INTO scores (student_id, exam_id, score) VALUES (12, 9, 94);
INSERT INTO scores (student_id, exam_id, score) VALUES (13, 9, 86);
INSERT INTO scores (student_id, exam_id, score) VALUES (14, 9, 79);
INSERT INTO scores (student_id, exam_id, score) VALUES (15, 9, 91);
