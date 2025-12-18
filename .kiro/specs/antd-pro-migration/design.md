# 设计文档

## 概述

本设计文档描述了将现有 React 前端应用迁移到 Ant Design Pro 模板架构的详细设计方案。迁移的目标是提高代码的可维护性、一致性和开发效率，同时保持所有现有功能的完整性。

迁移将采用渐进式方法，确保在整个过程中应用保持可用状态。主要改进包括：统一的布局系统、标准化的表格和表单组件、一致的主题系统、优化的路由配置以及改进的错误处理机制。

## 架构

### 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                     应用入口 (App.tsx)                        │
├─────────────────────────────────────────────────────────────┤
│                   ProLayout 布局系统                          │
│  ┌─────────────────┬─────────────────────────────────────┐   │
│  │   侧边栏导航      │           主内容区域                  │   │
│  │   - 菜单项       │   ┌─────────────────────────────┐   │   │
│  │   - 用户信息     │   │        PageContainer        │   │   │
│  │   - 折叠控制     │   │   ┌─────────────────────┐   │   │   │
│  │                │   │   │      页面组件         │   │   │   │
│  │                │   │   │   - ProTable        │   │   │   │
│  │                │   │   │   - ProForm         │   │   │   │
│  │                │   │   │   - 图表组件         │   │   │   │
│  │                │   │   └─────────────────────┘   │   │   │
│  │                │   └─────────────────────────────┘   │   │
│  └─────────────────┴─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 组件层次结构
- **应用层**: App.tsx - 路由配置和全局状态管理
- **布局层**: ProLayout - 统一的页面布局和导航
- **页面层**: 各个功能页面组件
- **组件层**: ProTable、ProForm 等可复用组件
- **服务层**: API 调用和数据处理
- **工具层**: 工具函数和常量定义

## 组件和接口

### 核心组件重构

#### 1. 布局组件 (ProLayoutWrapper)
```typescript
interface ProLayoutConfig {
  title: string;
  logo?: string | React.ReactNode;
  layout: 'side' | 'top' | 'mix';
  theme: 'light' | 'dark';
  menuData: MenuItem[];
  userInfo: UserInfo;
}

interface MenuItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  access?: string[];
}
```

#### 2. 表格组件 (ProTable)
```typescript
interface ProTableProps<T> {
  columns: ProColumns<T>[];
  request: (params: any) => Promise<{ data: T[]; total: number }>;
  search?: SearchConfig;
  toolBarRender?: () => React.ReactNode[];
  rowSelection?: TableRowSelection<T>;
  pagination?: PaginationConfig;
}

interface ProColumns<T> extends ColumnType<T> {
  valueType?: 'text' | 'select' | 'date' | 'dateRange';
  hideInSearch?: boolean;
  hideInTable?: boolean;
  request?: () => Promise<{ label: string; value: any }[]>;
}
```

#### 3. 表单组件 (ProForm)
```typescript
interface ProFormProps {
  onFinish: (values: any) => Promise<void>;
  initialValues?: any;
  layout?: 'horizontal' | 'vertical' | 'inline';
  submitter?: SubmitterProps;
  loading?: boolean;
}

interface ProFormFieldProps {
  name: string;
  label: string;
  rules?: Rule[];
  valueType?: 'text' | 'password' | 'select' | 'date';
  request?: () => Promise<{ label: string; value: any }[]>;
}
```

### 路由配置接口
```typescript
interface RouteConfig {
  path: string;
  name: string;
  component: React.ComponentType;
  access?: string[];
  hideInMenu?: boolean;
  icon?: React.ReactNode;
  children?: RouteConfig[];
}
```

### 主题配置接口
```typescript
interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  colorBgContainer: string;
  colorText: string;
  fontSize: number;
  fontFamily: string;
}
```

## 数据模型

### 用户数据模型
```typescript
interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string;
  permissions: string[];
}
```

### 菜单数据模型
```typescript
interface MenuData {
  id: string;
  name: string;
  path: string;
  icon?: string;
  parentId?: string;
  order: number;
  access?: string[];
  children?: MenuData[];
}
```

### 表格数据模型
```typescript
interface TableData<T> {
  data: T[];
  total: number;
  current: number;
  pageSize: number;
  success: boolean;
}

interface SearchParams {
  current: number;
  pageSize: number;
  [key: string]: any;
}
```

### 表单数据模型
```typescript
interface FormData {
  [key: string]: any;
}

interface FormValidation {
  field: string;
  message: string;
  type: 'error' | 'warning';
}
```

## 正确性属性

*属性是应该在系统的所有有效执行中保持为真的特征或行为——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: ProLayout 布局一致性
*对于任何*页面导航操作，导航前后的布局结构应保持一致，包括侧边栏、头部和内容区域的基本结构
**验证: 需求 1.2**

### 属性 2: ProTable 组件统一性
*对于任何*数据表格页面，都应使用 ProTable 组件渲染，并具有一致的搜索、过滤和分页功能
**验证: 需求 2.1**

### 属性 3: 表格过滤器一致性
*对于任何*表格过滤操作，所有表格应提供相同的过滤界面和交互模式
**验证: 需求 2.2**

### 属性 4: 表格分页状态保持
*对于任何*表格分页操作，分页状态应正确维护，用户的当前页面和每页条数设置应保持不变
**验证: 需求 2.3**

### 属性 5: 表格操作反馈一致性
*对于任何*表格操作（增删改查），系统应一致地提供加载状态指示和错误处理反馈
**验证: 需求 2.4**

### 属性 6: 表格数据更新状态保持
*对于任何*表格数据更新操作，更新后应自动刷新显示，同时保持用户的当前视图状态（页码、排序、过滤条件）
**验证: 需求 2.5**

### 属性 7: ProForm 组件统一性
*对于任何*表单页面，都应使用 ProForm 组件渲染，并具有一致的样式和布局
**验证: 需求 3.1**

### 属性 8: 表单验证系统一致性
*对于任何*表单提交操作，都应使用 ProForm 的内置验证系统进行数据验证
**验证: 需求 3.2**

### 属性 9: 表单错误消息格式一致性
*对于任何*表单验证失败情况，错误消息应以一致的格式和样式显示
**验证: 需求 3.3**

### 属性 10: 表单实时反馈
*对于任何*表单字段交互，系统应提供实时的验证反馈和状态指示
**验证: 需求 3.4**

### 属性 11: 表单加载状态一致性
*对于任何*表单加载状态，输入字段应被禁用，并显示一致的加载指示器
**验证: 需求 3.5**

### 属性 12: 路由认证保护
*对于任何*受保护的路由访问，未认证用户应被重定向到登录页面
**验证: 需求 4.2**

### 属性 13: 导航状态同步
*对于任何*页面导航操作，面包屑和活动菜单项应自动更新以反映当前页面
**验证: 需求 4.3**

### 属性 14: 深度链接支持
*对于任何*应用路由，直接访问该路由的URL应能正确加载对应的页面
**验证: 需求 4.4**

### 属性 15: 页面元信息更新
*对于任何*路由变化，页面标题和元信息应正确更新以反映当前页面
**验证: 需求 4.5**

### 属性 16: UI 元素样式一致性
*对于任何*相同类型的 UI 元素，在不同页面中应保持一致的间距、颜色和排版
**验证: 需求 5.2**

### 属性 17: 响应式设计一致性
*对于任何*屏幕尺寸变化，应用应提供符合 Pro 模板指南的响应式布局
**验证: 需求 5.3**

### 属性 18: 页面视觉一致性
*对于任何*页面切换，相同类型的组件应保持视觉样式的一致性
**验证: 需求 5.4**

### 属性 19: 反馈组件标准化
*对于任何*加载或错误状态，系统应使用 Pro 模板的标准反馈组件
**验证: 需求 5.5**

### 属性 20: 功能完整性保持
*对于任何*现有功能，迁移后应提供与迁移前相同的功能能力
**验证: 需求 7.1**

### 属性 21: CRUD 功能保持
*对于任何*数据操作，系统应维护所有当前的创建、读取、更新、删除功能
**验证: 需求 7.2**

### 属性 22: 数据可视化功能保持
*对于任何*图表和分析功能，应显示相同的数据内容，样式可以改进但数据结构应保持
**验证: 需求 7.3**

### 属性 23: 路由功能保持
*对于任何*现有路由，迁移后应保留相同的路由路径和页面功能
**验证: 需求 7.4**

### 属性 24: 过滤搜索功能保持
*对于任何*过滤和搜索操作，系统应维护所有当前的过滤和搜索能力
**验证: 需求 7.5**

### 属性 25: 加载状态标准化
*对于任何*API 调用，系统应使用 Pro 模板的加载组件显示加载状态
**验证: 需求 8.1**

### 属性 26: 错误处理模式标准化
*对于任何*错误情况，系统应使用 Pro 模板的错误处理模式显示错误消息
**验证: 需求 8.2**

### 属性 27: 网络错误处理
*对于任何*网络请求失败，系统应提供重试机制和用户友好的错误消息
**验证: 需求 8.3**

### 属性 28: 骨架加载状态
*对于任何*数据获取操作，系统应显示骨架加载状态以改善用户体验
**验证: 需求 8.4**

### 属性 29: 成功反馈标准化
*对于任何*操作完成，系统应使用 Pro 模板的通知系统提供成功反馈
**验证: 需求 8.5**

## 错误处理

### 错误分类和处理策略

#### 1. 网络错误
- **连接超时**: 显示重试按钮，允许用户手动重试
- **服务器错误 (5xx)**: 显示通用错误消息，记录详细错误信息
- **客户端错误 (4xx)**: 显示具体错误消息，引导用户修正

#### 2. 数据验证错误
- **表单验证**: 使用 ProForm 的内置验证，实时显示错误提示
- **业务规则验证**: 在提交时显示具体的业务错误消息
- **数据格式错误**: 在数据处理层捕获并转换为用户友好的消息

#### 3. 权限错误
- **未登录**: 自动重定向到登录页面
- **权限不足**: 显示权限不足页面，提供返回按钮
- **会话过期**: 提示用户重新登录

#### 4. 组件错误
- **渲染错误**: 使用 ErrorBoundary 捕获，显示降级 UI
- **数据加载错误**: 显示重试按钮和错误信息
- **组件状态错误**: 重置组件状态，记录错误日志

### 错误处理组件设计
```typescript
interface ErrorHandlerProps {
  error: Error;
  errorInfo?: ErrorInfo;
  onRetry?: () => void;
  fallback?: React.ComponentType;
}

interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}
```

## 测试策略

### 双重测试方法

本项目将采用单元测试和基于属性的测试相结合的方法：

- **单元测试**: 验证具体示例、边界情况和错误条件
- **基于属性的测试**: 验证应在所有输入中保持的通用属性
- 两种测试方法互补：单元测试捕获具体错误，属性测试验证通用正确性

### 单元测试策略

单元测试将覆盖：
- 组件渲染的具体示例
- 组件间的集成点
- 单元测试有助于验证具体行为，但避免编写过多测试
- 主要由基于属性的测试处理大量输入的覆盖

### 基于属性的测试策略

将使用 **fast-check** 作为 JavaScript/TypeScript 的基于属性的测试库。

基于属性的测试配置：
- 每个基于属性的测试必须运行最少 100 次迭代，因为属性测试过程是随机的
- 每个基于属性的测试必须使用注释明确引用设计文档中的正确性属性
- 每个基于属性的测试必须使用以下确切格式标记：'**Feature: antd-pro-migration, Property {number}: {property_text}**'
- 每个正确性属性必须由单个基于属性的测试实现

### 测试库和工具
- **测试框架**: Jest + React Testing Library
- **基于属性的测试**: fast-check
- **组件测试**: @testing-library/react
- **端到端测试**: Playwright (可选)
- **覆盖率工具**: Jest Coverage

### 测试数据生成策略
编写智能生成器，智能地约束到输入空间：
- **用户数据生成器**: 生成有效的用户对象，包含必需字段
- **表格数据生成器**: 生成符合表格结构的数据集
- **表单数据生成器**: 生成各种有效和无效的表单输入
- **路由数据生成器**: 生成有效的路由路径和参数
- **UI 状态生成器**: 生成各种 UI 状态组合