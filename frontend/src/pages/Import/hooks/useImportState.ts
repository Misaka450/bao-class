import { useState, useCallback } from 'react';
import { message } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../../config';
import { useAuthStore } from '../../../store/authStore';

export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    warnings?: number;
    errors?: string[];
    error?: string;
}

export interface ValidationResult {
    valid: number;
    invalid: number;
    warnings?: Array<{
        level: 'error' | 'warning';
        row: number;
        field?: string;
        message: string;
        value?: string;
        fixed?: boolean;
        before?: string;
        after?: string;
    }>;
    fixedData?: any[];
}

export function useImportBase() {
    const { token } = useAuthStore();
    const [currentStep, setCurrentStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [uploadedFile, setUploadedFile] = useState<RcFile | null>(null);

    // 解析 Excel 文件
    const parseExcelFile = useCallback(async (file: RcFile): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }, []);

    // 重置状态
    const handleReset = useCallback(() => {
        setCurrentStep(0);
        setPreviewData([]);
        setValidationResult(null);
        setUploadedFile(null);
        setResult(null);
    }, []);

    return {
        token,
        currentStep,
        setCurrentStep,
        uploading,
        setUploading,
        validating,
        setValidating,
        result,
        setResult,
        previewData,
        setPreviewData,
        validationResult,
        setValidationResult,
        uploadedFile,
        setUploadedFile,
        parseExcelFile,
        handleReset,
    };
}

export function useClassesAndExams() {
    const { token, user } = useAuthStore();
    const [classes, setClasses] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);

    const fetchClasses = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClasses(data);
        } catch (error) {
            console.error('Failed to fetch classes', error);
        }
    }, [token]);

    const fetchExams = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/exams`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
        } catch (error) {
            console.error('Failed to fetch exams', error);
        }
    }, [token]);

    // 根据用户权限过滤
    const filteredClasses = classes.filter(c =>
        user?.role === 'admin' ||
        (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(c.id))
    );

    const filteredExams = exams.filter(e =>
        user?.role === 'admin' ||
        (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(e.class_id))
    );

    return {
        classes,
        exams,
        filteredClasses,
        filteredExams,
        fetchClasses,
        fetchExams,
    };
}
