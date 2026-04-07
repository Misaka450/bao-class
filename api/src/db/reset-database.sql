-- ============================================
-- 数据库管理工具脚本
-- ============================================
-- 用途：开发环境数据库重置和数据导入
-- 警告：生产环境禁止使用！
-- ============================================

-- ============================================
-- 1. 完全重置数据库
-- ============================================
-- 使用说明：
-- 1. 删除所有表（按依赖顺序）
-- 2. 重置自增序列
-- 3. 重新创建表结构
-- 4. 导入测试数据

-- 删除所有表（按外键依赖顺序）
DROP TABLE IF EXISTS homework_submissions;
DROP TABLE IF EXISTS homework;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS exam_courses;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS ai_comments;
DROP TABLE IF EXISTS ai_comment_templates;
DROP TABLE IF EXISTS lesson_plans;
DROP TABLE IF EXISTS modification_logs;

-- 重置自增序列（SQLite 专用）
DELETE FROM sqlite_sequence;

-- ============================================
-- 2. 清空数据（保留表结构）
-- ============================================
-- 使用说明：仅删除数据，不删除表结构
-- 用途：快速清空测试数据

-- 清空所有表数据（按依赖顺序）
DELETE FROM homework_submissions;
DELETE FROM homework;
DELETE FROM scores;
DELETE FROM exam_courses;
DELETE FROM exams;
DELETE FROM students;
DELETE FROM courses;
DELETE FROM classes;
DELETE FROM users;
DELETE FROM audit_logs;
DELETE FROM ai_comments;
DELETE FROM ai_comment_templates;
DELETE FROM lesson_plans;

-- 重置自增 ID
DELETE FROM sqlite_sequence WHERE name IN (
    'users', 'classes', 'students', 'courses', 
    'exams', 'exam_courses', 'scores', 
    'homework', 'homework_submissions',
    'lesson_plans', 'ai_comments'
);

-- ============================================
-- 3. 导入测试数据
-- ============================================
-- 使用说明：导入完整的测试数据集
-- 用途：开发环境初始化

-- 详见 test-data-v4.sql 文件
-- 执行：
-- .read test-data-v4.sql

-- ============================================
-- 4. 完整重置并导入
-- ============================================
-- 使用说明：完全重建数据库并导入测试数据
-- 用途：开发环境快速初始化

-- 先执行重置（第 1 部分）
-- 然后导入测试数据
-- .read test-data-v4.sql

-- ============================================
-- 注意事项
-- ============================================
-- 1. 生产环境禁止使用此脚本
-- 2. 执行前务必备份数据
-- 3. 确保没有活跃的数据库连接
-- 4. 测试环境使用专用测试数据库
