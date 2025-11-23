# API 文档

## 基础信息

- **Base URL**: `https://api.980823.xyz/api` (生产环境)
- **Base URL**: `http://localhost:8787/api` (开发环境)
- **认证方式**: JWT Bearer Token

## 认证接口

### 登录
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "name": "管理员"
    }
  }
}
```

### 获取当前用户
```http
GET /auth/me
Authorization: Bearer {token}
```

## 数据管理接口

### 班级管理

#### 获取班级列表
```http
GET /classes
Authorization: Bearer {token}
```

#### 创建班级
```http
POST /classes
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "三年级一班",
  "grade": 3
}
```

### 学生管理

#### 获取学生列表
```http
GET /students?class_id=1
Authorization: Bearer {token}
```

#### 创建学生
```http
POST /students
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "张三",
  "student_id": "20231001",
  "class_id": 1,
  "gender": "male"
}
```

### 成绩管理

#### 获取成绩列表
```http
GET /scores?exam_id=1&course_id=1
Authorization: Bearer {token}
```

#### 录入成绩
```http
POST /scores
Authorization: Bearer {token}
Content-Type: application/json

{
  "student_id": 1,
  "exam_id": 1,
  "course_id": 1,
  "score": 85.5
}
```

## 统计分析接口

### 学生档案
```http
GET /stats/profile/:studentId
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "student": {...},
    "history": [...],
    "radar": [...],
    "weak_subjects": [...],
    "advantage_subjects": [...],
    "statistics": {
      "progress_rate": 5.2,
      "rank_progress": 3,
      "percentile": 75.5,
      "total_exams": 5
    }
  }
}
```

### 班级统计
```http
GET /stats?class_id=1&exam_id=1&course_id=1
Authorization: Bearer {token}
```

## 错误响应

所有错误响应格式:
```json
{
  "success": false,
  "error": "错误消息",
  "message": "详细说明"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权或token过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 速率限制

- 时间窗口: 15分钟
- 最大请求数: 1000次
- 超出限制将返回 429 状态码

## 数据验证

所有输入数据都经过 Zod schema 验证,确保数据类型和格式正确。
