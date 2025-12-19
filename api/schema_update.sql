CREATE TABLE IF NOT EXISTS ai_class_reports (
    class_id TEXT NOT NULL,
    exam_id INTEGER NOT NULL,
    report_content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, exam_id)
);
