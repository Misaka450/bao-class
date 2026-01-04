import { ReactNode } from 'react';
import { Alert, Table, Card, Descriptions, Collapse, Tag } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Panel } = Collapse;

interface ValidationSummaryProps {
    validationResult: {
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
    } | null;
}

export function ValidationSummary({ validationResult }: ValidationSummaryProps) {
    if (!validationResult) return null;

    const { valid, invalid, warnings } = validationResult;
    const errors = warnings?.filter(w => w.level === 'error') || [];
    const warns = warnings?.filter(w => w.level === 'warning') || [];

    return (
        <Alert
            type={invalid > 0 ? 'error' : warns.length > 0 ? 'warning' : 'success'}
            message={
                <div>
                    <span style={{ marginRight: 16 }}>✅ 有效: {valid} 条</span>
                    {invalid > 0 && <span style={{ marginRight: 16 }}>❌ 错误: {invalid} 条</span>}
                    {warns.length > 0 && <span>⚠️ 警告: {warns.length} 条</span>}
                </div>
            }
            description={
                <Collapse ghost>
                    {errors.length > 0 && (
                        <Panel header={`错误详情 (${errors.length})`} key="errors">
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {errors.slice(0, 10).map((err, idx) => (
                                    <li key={idx} style={{ color: '#ff4d4f' }}>
                                        第 {err.row} 行 {err.field && `[${err.field}]`}: {err.message}
                                        {err.value && ` (${err.value})`}
                                    </li>
                                ))}
                                {errors.length > 10 && <li>...还有 {errors.length - 10} 条错误</li>}
                            </ul>
                        </Panel>
                    )}
                    {warns.length > 0 && (
                        <Panel header={`警告详情 (${warns.length})`} key="warnings">
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {warns.slice(0, 10).map((warn, idx) => (
                                    <li key={idx} style={{ color: '#faad14' }}>
                                        第 {warn.row} 行 {warn.field && `[${warn.field}]`}: {warn.message}
                                        {warn.fixed && warn.before && warn.after && (
                                            <span> (已修正: "{warn.before}" → "{warn.after}")</span>
                                        )}
                                    </li>
                                ))}
                                {warns.length > 10 && <li>...还有 {warns.length - 10} 条警告</li>}
                            </ul>
                        </Panel>
                    )}
                </Collapse>
            }
            style={{ marginBottom: 16 }}
        />
    );
}

interface PreviewTableProps {
    data: any[];
}

export function PreviewTable({ data }: PreviewTableProps) {
    if (data.length === 0) return null;

    const columns = Object.keys(data[0]).map(key => ({
        title: key,
        dataIndex: key,
        key,
        width: 120,
        ellipsis: true
    }));

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey={(_, index) => index!}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            scroll={{ x: 'max-content' }}
            size="small"
        />
    );
}

interface ResultSummaryProps {
    result: {
        total: number;
        success: number;
        failed: number;
        warnings?: number;
        errors?: string[];
    } | null;
}

export function ResultSummary({ result }: ResultSummaryProps) {
    if (!result) return null;

    return (
        <Card style={{ marginBottom: 16 }}>
            <Descriptions title="导入结果" column={4}>
                <Descriptions.Item label="总计">{result.total}</Descriptions.Item>
                <Descriptions.Item label={<span style={{ color: '#52c41a' }}>成功</span>}>
                    <Tag color="success" icon={<CheckCircleOutlined />}>{result.success}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<span style={{ color: '#ff4d4f' }}>失败</span>}>
                    <Tag color="error" icon={<CloseCircleOutlined />}>{result.failed}</Tag>
                </Descriptions.Item>
                {result.warnings !== undefined && (
                    <Descriptions.Item label={<span style={{ color: '#faad14' }}>警告</span>}>
                        <Tag color="warning" icon={<WarningOutlined />}>{result.warnings || 0}</Tag>
                    </Descriptions.Item>
                )}
            </Descriptions>

            {result.errors && result.errors.length > 0 && (
                <Collapse style={{ marginTop: 16 }}>
                    <Panel header={`错误详情 (${result.errors.length})`} key="errors">
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {result.errors.map((err, idx) => (
                                <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                            ))}
                        </ul>
                    </Panel>
                </Collapse>
            )}
        </Card>
    );
}
