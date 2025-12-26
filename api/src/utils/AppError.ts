/**
 * 应用级别错误类
 * 用于统一的错误处理和响应格式
 */
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'AppError';
    }

    /**
     * 创建 400 Bad Request 错误
     */
    static badRequest(message: string, code?: string): AppError {
        return new AppError(message, 400, code || ErrorCodes.VALIDATION_FAILED);
    }

    /**
     * 创建 401 Unauthorized 错误
     */
    static unauthorized(message: string = '未授权', code?: string): AppError {
        return new AppError(message, 401, code || ErrorCodes.TOKEN_INVALID);
    }

    /**
     * 创建 403 Forbidden 错误
     */
    static forbidden(message: string = '权限不足', code?: string): AppError {
        return new AppError(message, 403, code || ErrorCodes.FORBIDDEN);
    }

    /**
     * 创建 404 Not Found 错误
     */
    static notFound(message: string = '资源不存在', code?: string): AppError {
        return new AppError(message, 404, code || ErrorCodes.NOT_FOUND);
    }

    /**
     * 创建 500 Internal Server Error 错误
     */
    static internal(message: string = '服务器内部错误', code?: string): AppError {
        return new AppError(message, 500, code || ErrorCodes.INTERNAL_ERROR);
    }
}

/**
 * 标准错误码常量
 * 格式：E{类别}{序号}
 * - 1xxx: 认证错误
 * - 2xxx: 权限错误
 * - 3xxx: 资源错误
 * - 4xxx: 验证错误
 * - 5xxx: 服务器错误
 */
export const ErrorCodes = {
    // 认证错误 (1xxx)
    INVALID_CREDENTIALS: 'E1001',
    TOKEN_EXPIRED: 'E1002',
    TOKEN_INVALID: 'E1003',
    TOKEN_MISSING: 'E1004',

    // 权限错误 (2xxx)
    FORBIDDEN: 'E2001',
    NO_CLASS_ACCESS: 'E2002',
    ROLE_NOT_ALLOWED: 'E2003',

    // 资源错误 (3xxx)
    NOT_FOUND: 'E3001',
    ALREADY_EXISTS: 'E3002',
    RESOURCE_LOCKED: 'E3003',

    // 验证错误 (4xxx)
    VALIDATION_FAILED: 'E4001',
    INVALID_PARAM: 'E4002',
    MISSING_REQUIRED: 'E4003',
    INVALID_FORMAT: 'E4004',

    // 服务器错误 (5xxx)
    INTERNAL_ERROR: 'E5001',
    AI_SERVICE_ERROR: 'E5002',
    DB_ERROR: 'E5003',
    EXTERNAL_SERVICE_ERROR: 'E5004'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
