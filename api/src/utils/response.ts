export const successResponse = (data: any, message = 'Success') => ({
    success: true,
    message,
    data
})

export const errorResponse = (message: string, details?: any) => ({
    success: false,
    message,
    details
})
