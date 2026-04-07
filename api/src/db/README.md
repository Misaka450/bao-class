# 数据库管理文档

## 📁 文件结构

```
db/
├── migrations/              # 数据库迁移文件
│   ├── 001_ai_comments.sql
│   ├── 002_add_missing_tables.sql
│   ├── 003_lesson_prep.sql
│   ├── 004_simplify_lesson_prep.sql
│   ├── 005_homework.sql
│   └── MIGRATION_LOG.md     # 迁移日志
├── schema.sql               # 完整数据库结构
├── indexes.sql              # 性能优化索引
├── test-data-v4.sql         # 测试数据
├── reset-database.sql       # 数据库重置工具
└── README.md                # 本文档
```

## 🚀 快速开始

### 开发环境初始化

```bash
# 1. 使用 Wrangler 创建 D1 数据库
wrangler d1 create class

# 2. 执行迁移
wrangler d1 execute class --local --file=src/db/schema.sql
wrangler d1 execute class --local --file=src/db/indexes.sql

# 3. 导入测试数据
wrangler d1 execute class --local --file=src/db/test-data-v4.sql
```

### 生产环境部署

```bash
# 1. 执行所有迁移（按顺序）
wrangler d1 execute class --remote --file=src/db/migrations/001_ai_comments.sql
wrangler d1 execute class --remote --file=src/db/migrations/002_add_missing_tables.sql
wrangler d1 execute class --remote --file=src/db/migrations/003_lesson_prep.sql
wrangler d1 execute class --remote --file=src/db/migrations/004_simplify_lesson_prep.sql
wrangler d1 execute class --remote --file=src/db/migrations/005_homework.sql

# 2. 创建索引
wrangler d1 execute class --remote --file=src/db/indexes.sql
```

## 📝 数据库重置

### 开发环境

```bash
# 完全重置数据库（包括测试数据）
wrangler d1 execute class --local --file=src/db/reset-database.sql
wrangler d1 execute class --local --file=src/db/test-data-v4.sql
```

### 生产环境（⚠️ 谨慎使用）

```bash
# ⚠️ 警告：这将删除所有数据！
wrangler d1 execute class --remote --file=src/db/reset-database.sql
```

## 📊 核心表说明

### 用户系统
| 表名 | 说明 | 字段数 |
|------|------|--------|
| `users` | 用户表 | 8 |
| `audit_logs` | 操作日志 | 8 |

### 班级管理
| 表名 | 说明 | 字段数 |
|------|------|--------|
| `classes` | 班级表 | 6 |
| `students` | 学生表 | 8 |
| `courses` | 科目表 | 5 |

### 考试系统
| 表名 | 说明 | 字段数 |
|------|------|--------|
| `exams` | 考试表 | 7 |
| `exam_courses` | 考试 - 科目关联 | 6 |
| `scores` | 成绩表 | 8 |

### 教学功能
| 表名 | 说明 | 字段数 |
|------|------|--------|
| `lesson_plans` | 备课表 | 9 |
| `homework` | 作业表 | 10 |
| `homework_submissions` | 作业提交 | 8 |

### AI 功能
| 表名 | 说明 | 字段数 |
|------|------|--------|
| `ai_comments` | AI 评语 | 8 |
| `ai_comment_templates` | 评语模板 | 6 |

## 🔧 常用 SQL 查询

### 查看班级列表
```sql
SELECT * FROM classes ORDER BY grade, name;
```

### 查看学生成绩
```sql
SELECT s.name, sc.score, e.name as exam_name, c.name as course_name
FROM scores sc
JOIN students s ON sc.student_id = s.id
JOIN exams e ON sc.exam_id = e.id
JOIN exam_courses ec ON sc.exam_id = ec.exam_id AND sc.course_id = ec.course_id
JOIN courses c ON ec.course_id = c.id
WHERE s.class_id = 1
ORDER BY e.exam_date DESC, c.name;
```

### 查看操作日志
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

## 📈 性能优化

详见 [indexes.sql](indexes.sql)，包含：

- 成绩查询优化索引
- 考试查询优化索引
- 学生查询优化索引
- 班级查询优化索引

预期性能提升：
- 学生档案查询：50-80%
- 班级成绩统计：60-90%
- 排名计算：40-70%
- 年级对比：70-90%

## ⚠️ 注意事项

1. **生产环境操作**
   - 执行任何 DDL 操作前必须备份数据
   - 使用 `--remote` 参数时格外小心
   - 建议在业务低峰期执行

2. **迁移顺序**
   - 必须按照版本号顺序执行
   - 每个迁移文件都是增量变更
   - 不要跳过任何迁移

3. **测试数据**
   - 仅用于开发环境
   - 生产环境使用真实数据
   - 定期清理过期测试数据

4. **索引维护**
   - 定期检查索引使用情况
   - 删除未使用的索引
   - 根据查询模式优化索引

## 🔍 故障排查

### 迁移失败
```bash
# 查看最近的迁移
wrangler d1 execute class --remote --command="SELECT * FROM d1_migrations ORDER BY version DESC LIMIT 10;"
```

### 性能问题
```bash
# 查看慢查询（需要开启查询日志）
wrangler d1 execute class --remote --command="SELECT * FROM query_logs WHERE duration_ms > 1000 ORDER BY created_at DESC LIMIT 10;"
```

### 数据一致性检查
```bash
# 检查外键约束
wrangler d1 execute class --remote --command="PRAGMA foreign_key_check;"
```

## 📚 相关文档

- [迁移日志](migrations/MIGRATION_LOG.md) - 详细迁移历史
- [Schema 文件](schema.sql) - 完整表结构
- [索引文件](indexes.sql) - 性能优化索引
