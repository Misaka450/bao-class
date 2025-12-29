-- 简化 lesson_plans 表: 移除 catalog_id 依赖，添加 subject/grade/volume 字段
-- 由于 SQLite 不支持 DROP COLUMN，需要重建表

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS lesson_plans_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    class_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT,
    grade INTEGER,
    volume INTEGER,
    duration INTEGER,
    is_draft INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 迁移数据 (如果有)
INSERT INTO lesson_plans_new (id, user_id, class_id, title, content, is_draft, created_at, updated_at)
SELECT id, user_id, class_id, title, content, is_draft, created_at, updated_at
FROM lesson_plans;

-- 3. 删除旧表
DROP TABLE IF EXISTS lesson_plans;

-- 4. 重命名新表
ALTER TABLE lesson_plans_new RENAME TO lesson_plans;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user ON lesson_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id);

-- 6. 删除不再需要的 textbook_catalog 表
DROP TABLE IF EXISTS textbook_catalog;

-- 7. 创建 updated_at 触发器
CREATE TRIGGER IF NOT EXISTS trg_lesson_plans_updated
AFTER UPDATE ON lesson_plans
FOR EACH ROW
BEGIN
    UPDATE lesson_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
