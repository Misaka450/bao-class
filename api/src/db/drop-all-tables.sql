-- 完全重建数据库的脚本
-- 警告：这将删除所有数据！

-- 1. 删除所有表（按依赖顺序）
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS exam_courses;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS homework_submissions;
DROP TABLE IF EXISTS homework;
DROP TABLE IF EXISTS modification_logs;
DROP TABLE IF EXISTS users;
