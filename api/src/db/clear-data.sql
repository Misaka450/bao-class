-- 重置数据库并导入新数据的脚本

-- 1. 删除所有表数据（按照外键依赖顺序）
DELETE FROM scores;
DELETE FROM exam_courses;
DELETE FROM exams;
DELETE FROM students;
DELETE FROM courses;
DELETE FROM classes;
DELETE FROM users;

-- 2. 重置自增ID（SQLite）
DELETE FROM sqlite_sequence WHERE name IN ('users', 'classes', 'students', 'courses', 'exams', 'exam_courses', 'scores');
