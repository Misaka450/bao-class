-- 创建作业表
CREATE TABLE IF NOT EXISTS homework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT,
    grade INTEGER,
    topic TEXT,
    difficulty TEXT,  -- basic/advanced/challenge
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_homework_user ON homework(user_id);

-- 创建 updated_at 触发器
CREATE TRIGGER IF NOT EXISTS trg_homework_updated
AFTER UPDATE ON homework
FOR EACH ROW
BEGIN
    UPDATE homework SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
