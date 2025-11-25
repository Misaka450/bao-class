-- Insert Exam Courses
INSERT INTO exam_courses (exam_id, course_id, full_score)
SELECT id, 1, 100 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO exam_courses (exam_id, course_id, full_score)
SELECT id, 2, 100 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO exam_courses (exam_id, course_id, full_score)
SELECT id, 3, 100 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Insert Scores
-- Student 21 (Zhang Ming - Excellent)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 21, id, 1, 92 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 21, id, 2, 95 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 21, id, 3, 90 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 22 (Li Hua - Excellent)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 22, id, 1, 88 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 22, id, 2, 92 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 22, id, 3, 94 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 23 (Wang Fang - Excellent)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 23, id, 1, 90 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 23, id, 2, 89 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 23, id, 3, 91 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 24 (Liu Qiang - Progressive)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 24, id, 1, 75 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 24, id, 2, 78 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 24, id, 3, 72 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 25 (Chen Jing - Progressive)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 25, id, 1, 78 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 25, id, 2, 80 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 25, id, 3, 76 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 26 (Zhao Lei - Regressive)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 26, id, 1, 65 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 26, id, 2, 60 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 26, id, 3, 62 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 27 (Sun Li - Regressive)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 27, id, 1, 68 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 27, id, 2, 65 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 27, id, 3, 66 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 28 (Zhou Jie - Biased Math)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 28, id, 1, 60 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 28, id, 2, 95 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 28, id, 3, 58 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 29 (Wu Mei - Biased English)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 29, id, 1, 62 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 29, id, 2, 55 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 29, id, 3, 92 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');

-- Student 30 (Zheng Wei - Struggling)
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 30, id, 1, 55 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 30, id, 2, 48 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
INSERT INTO scores (student_id, exam_id, course_id, score) SELECT 30, id, 3, 52 FROM exams WHERE name = '2025年11月期中考试' AND class_id = (SELECT id FROM classes WHERE name = '三年级一班');
