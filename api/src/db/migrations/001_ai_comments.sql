-- AI Comments Table (AI 评语历史记录表)
-- 用于存储 AI 生成的学生评语，支持缓存和历史查询

CREATE TABLE IF NOT EXISTS ai_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    exam_id INTEGER,  -- 可选，关联特定考试；NULL 表示基于所有考试的综合评语
    comment TEXT NOT NULL,
    metadata TEXT,  -- JSON 格式，存储生成时的元数据（avg_score, trend, subjects等）
    edited INTEGER DEFAULT 0,  -- 0=未编辑, 1=已手动编辑
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_ai_comments_student ON ai_comments(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_comments_exam ON ai_comments(exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_comments_created ON ai_comments(created_at DESC);

-- 创建触发器：自动更新 updated_at
CREATE TRIGGER IF NOT EXISTS update_ai_comments_timestamp 
AFTER UPDATE ON ai_comments
FOR EACH ROW
BEGIN
    UPDATE ai_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
