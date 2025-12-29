-- AI 备课功能 - 教材目录表和教案表
-- Migration: 003_lesson_prep.sql

-- 教材目录表：存储教材结构（每个章节一条记录）
CREATE TABLE IF NOT EXISTS textbook_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher TEXT NOT NULL DEFAULT 'pep',     -- 出版社标识 (pep = 人教版)
    subject TEXT NOT NULL,                      -- 科目: math, chinese, english
    grade INTEGER NOT NULL,                     -- 年级: 1-6
    volume INTEGER NOT NULL,                    -- 册次: 1=上学期, 2=下学期
    unit_name TEXT NOT NULL,                    -- 单元名称
    lesson_name TEXT,                           -- 课时名称（可选）
    r2_path TEXT NOT NULL,                      -- R2 文件路径
    page_start INTEGER,                         -- 起始页码
    page_end INTEGER,                           -- 结束页码
    vectorize_ids TEXT,                         -- 关联的向量 ID (JSON 数组)
    status TEXT DEFAULT 'pending',              -- pending, processing, ready, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 教案表：存储 AI 生成的教案
CREATE TABLE IF NOT EXISTS lesson_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                   -- 创建者
    class_id INTEGER,                           -- 关联班级（可选）
    catalog_id INTEGER NOT NULL,                -- 关联教材目录
    title TEXT NOT NULL,                        -- 教案标题
    content TEXT NOT NULL,                      -- 教案内容 (Markdown)
    duration INTEGER,                           -- 课时时长（分钟）
    objectives TEXT,                            -- 教学目标 (JSON)
    key_points TEXT,                            -- 重难点 (JSON)
    activities TEXT,                            -- 教学活动 (JSON)
    metadata TEXT,                              -- 其他元数据 (JSON)
    is_draft INTEGER DEFAULT 1,                 -- 1=草稿, 0=已完成
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalog_id) REFERENCES textbook_catalog(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_catalog_subject_grade ON textbook_catalog(subject, grade, volume);
CREATE INDEX IF NOT EXISTS idx_catalog_status ON textbook_catalog(status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user ON lesson_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_catalog ON lesson_plans(catalog_id);

-- 更新触发器
CREATE TRIGGER IF NOT EXISTS trg_textbook_catalog_updated
AFTER UPDATE ON textbook_catalog
BEGIN
    UPDATE textbook_catalog SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_lesson_plans_updated
AFTER UPDATE ON lesson_plans
BEGIN
    UPDATE lesson_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
