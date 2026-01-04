import { useState } from 'react';
import { Tabs } from 'antd';
import { FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import ImportStudents from './ImportStudents';
import ImportScores from './ImportScores';
import ImportAI from './ImportAI';

export default function Import() {
    const [activeTab, setActiveTab] = useState('scores');
    const { user } = useAuthStore();

    const tabItems = [
        ...(user?.role === 'admin' ? [{
            key: 'students',
            label: (
                <span>
                    <FileExcelOutlined style={{ marginRight: 4 }} /> 学生导入
                </span>
            ),
            children: <ImportStudents />,
        }] : []),
        {
            key: 'scores',
            label: (
                <span>
                    <FileExcelOutlined style={{ marginRight: 4 }} /> 成绩导入
                </span>
            ),
            children: <ImportScores />,
        },
        {
            key: 'ai-scores',
            label: (
                <span>
                    <UploadOutlined /> AI 拍照导入
                </span>
            ),
            children: <ImportAI />,
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据导入</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>批量导入学生和成绩数据，支持智能验证和修复</p>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />
        </div>
    );
}
