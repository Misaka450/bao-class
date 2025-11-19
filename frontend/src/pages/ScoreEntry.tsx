import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Exam {
    id: number;
    name: string;
    class_id: number;
    course_name: string;
    class_name: string;
}

interface StudentScore {
    student_id: number;
    name: string;
    student_code: string;
    score: number | null;
    score_id: number | null;
}

export default function ScoreEntry() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<number | ''>('');
    const [students, setStudents] = useState<StudentScore[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            fetchScores(Number(selectedExamId));
        } else {
            setStudents([]);
        }
    }, [selectedExamId]);

    const fetchExams = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/exams', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
        } catch (error) {
            console.error('Failed to fetch exams', error);
        }
    };

    const fetchScores = async (examId: number) => {
        setLoading(true);
        try {
            const exam = exams.find(e => e.id === examId);
            if (!exam) return;

            const res = await fetch(`http://localhost:8787/api/scores?exam_id=${examId}&class_id=${exam.class_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setStudents(data);
        } catch (error) {
            console.error('Failed to fetch scores', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (studentId: number, value: string) => {
        const numValue = value === '' ? null : Number(value);
        setStudents(students.map(s =>
            s.student_id === studentId ? { ...s, score: numValue } : s
        ));
    };

    const handleSave = async () => {
        if (!selectedExamId) return;
        setSaving(true);
        try {
            const scoresToSave = students
                .filter(s => s.score !== null)
                .map(s => ({
                    student_id: s.student_id,
                    score: s.score
                }));

            await fetch('http://localhost:8787/api/scores/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    exam_id: Number(selectedExamId),
                    scores: scoresToSave
                }),
            });

            alert('成绩保存成功！');
            fetchScores(Number(selectedExamId));
        } catch (error) {
            console.error('Failed to save scores', error);
            alert('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">成绩录入</h1>
                    <p className="text-gray-500 mt-1">批量录入班级考试成绩</p>
                </div>
                <div className="w-64">
                    <select
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">选择考试...</option>
                        {exams.map((exam) => (
                            <option key={exam.id} value={exam.id}>
                                {exam.name} - {exam.class_name} ({exam.course_name})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedExamId && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            加载学生名单...
                        </div>
                    ) : (
                        <>
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">学号</th>
                                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">姓名</th>
                                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">分数</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {students.map((student) => (
                                            <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-500">{student.student_code}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                                                <td className="px-6 py-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                        value={student.score ?? ''}
                                                        onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
                                                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                                    该班级暂无学生
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || students.length === 0}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                    保存成绩
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {!selectedExamId && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">请先选择一场考试开始录入成绩</p>
                </div>
            )}
        </div>
    );
}
