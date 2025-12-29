# 错误处理和加载状态标准化

本文档描述了基于 Ant Design Pro 模板实现的统一错误处理和加载状态系统。

## 实现的组件

### 1. 错误处理组件

#### ErrorHandler (`/ErrorHandler/index.tsx`)
- 统一的错误显示组件
- 支持不同类型的错误（网络、权限、一般错误等）
- 提供重试和导航功能
- 可配置的错误详情显示

#### ErrorBoundary (`/ErrorBoundary.tsx`)
- 增强的错误边界组件
- 集成了统一的错误处理
- 支持自定义 fallback 组件
- 生产环境错误日志记录

#### NetworkErrorHandler (`/ErrorHandler/NetworkErrorHandler.tsx`)
- 专门处理网络错误的组件
- 自动重试机制（指数退避）
- 最大重试次数限制
- 用户友好的错误提示

### 2. 加载状态组件

#### SkeletonLoading (`/Loading/SkeletonLoading.tsx`)
- 统一的骨架屏加载组件
- 支持多种类型：表格、表单、卡片、列表、图表、用户资料
- 可配置的加载状态
- 基于 Ant Design 的 Spin 组件

#### Loading (`/Loading.tsx`)
- 增强的加载组件
- 支持传统 Spin 和骨架屏两种模式
- 可配置的加载提示和样式

### 3. 反馈系统

#### FeedbackManager (`/Feedback/index.tsx`)
- 统一的反馈管理系统
- 支持消息、通知、模态对话框
- 标准化的成功、错误、警告、信息反馈
- 便捷的 API 调用方法

#### 反馈配置 (`/config/feedback.ts`)
- 全局反馈系统配置
- 标准化的消息模板
- 持续时间和样式配置

### 4. Hooks

#### useErrorHandler (`/hooks/useErrorHandler.ts`)
- 统一的错误处理 Hook
- 自动分类错误类型
- 集成认证和权限错误处理
- 可配置的错误反馈选项

#### useLoading (`/hooks/useLoading.ts`)
- 加载状态管理 Hook
- 最小加载时间控制（避免闪烁）
- 异步操作包装
- 错误和数据状态管理

#### useFeedback (`/hooks/useFeedback.ts`)
- 反馈系统 Hook
- 便捷的成功、错误反馈方法
- 确认对话框支持
- 操作反馈的标准化处理

### 5. 服务层增强

#### 请求服务 (`/services/request.ts`)
- 增强的请求错误处理
- 详细的错误分类和状态码处理
- 支持 FormData 和 JSON 请求
- 标准化的错误对象格式

## 使用示例

### 错误处理
```tsx
import { ErrorHandler } from '../components/ErrorHandler';

// 基本用法
<ErrorHandler 
  error={{ message: '操作失败' }}
  onRetry={() => refetch()}
/>

// 网络错误
<ErrorHandler 
  error={{ message: '网络连接失败' }}
  type="network"
  onRetry={() => refetch()}
/>
```

### 加载状态
```tsx
import { SkeletonLoading } from '../components/Loading/SkeletonLoading';

// 表格骨架屏
<SkeletonLoading type="table" loading={isLoading}>
  <ProTable {...tableProps} />
</SkeletonLoading>

// 表单骨架屏
<SkeletonLoading type="form" loading={isLoading}>
  <ProForm {...formProps} />
</SkeletonLoading>
```

### 反馈系统
```tsx
import { useFeedback } from '../hooks/useFeedback';

const MyComponent = () => {
  const feedback = useFeedback();

  const handleSave = async () => {
    try {
      await saveData();
      feedback.success.message('保存成功');
    } catch (error) {
      feedback.error.notification('保存失败', error.message);
    }
  };
};
```

### 错误处理 Hook
```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';

const MyComponent = () => {
  const { handleAsyncError } = useErrorHandler();

  const fetchData = () => {
    return handleAsyncError(
      () => api.getData(),
      { showNotification: true },
      { action: 'fetchData', component: 'MyComponent' }
    );
  };
};
```

## 特性

### 1. 统一性
- 所有错误处理遵循相同的模式
- 一致的用户体验和视觉设计
- 标准化的反馈消息和持续时间

### 2. 可配置性
- 灵活的错误类型和显示选项
- 可自定义的加载状态和骨架屏
- 可配置的反馈样式和行为

### 3. 用户体验优化
- 最小加载时间控制，避免闪烁
- 自动重试机制，减少用户操作
- 友好的错误提示和恢复建议

### 4. 开发者友好
- 简洁的 API 设计
- 完整的 TypeScript 类型支持
- 便捷的 Hook 封装

### 5. Pro 模板兼容
- 遵循 Ant Design Pro 设计规范
- 与现有组件系统无缝集成
- 支持主题定制和响应式设计

## 测试

所有组件都包含了相应的单元测试，确保功能的正确性和稳定性。测试覆盖了：

- 组件渲染和属性传递
- 用户交互和事件处理
- 错误边界和异常情况
- Hook 的状态管理和副作用

运行测试：
```bash
npm run test:run
```

## 注意事项

1. **错误边界**: ErrorBoundary 只能捕获组件树中的 JavaScript 错误，不能捕获事件处理器、异步代码或服务端渲染的错误。

2. **加载状态**: SkeletonLoading 组件使用了 Spin 组件，在某些情况下可能会显示警告，这是正常的。

3. **反馈系统**: FeedbackManager 依赖于 Ant Design 的全局配置，确保在应用根部正确配置了 ConfigProvider。

4. **网络错误**: NetworkErrorHandler 的自动重试功能使用了指数退避算法，避免对服务器造成过大压力。

5. **类型安全**: 所有组件和 Hook 都提供了完整的 TypeScript 类型定义，建议在使用时充分利用类型检查。