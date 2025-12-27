import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';

interface ChapterInfo {
    unit: string;
    lesson?: string;
    startPage: number;
    endPage: number;
}

interface TextbookMetadata {
    publisher: string;
    subject: string;
    grade: number;
    volume: number;
}

export class TextbookService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 解析 R2 路径获取教材元数据
     * 路径格式: pep/math/grade5/vol1.pdf
     */
    parseR2Path(key: string): TextbookMetadata {
        const parts = key.replace('.pdf', '').split('/');
        if (parts.length < 4) {
            throw new AppError('Invalid R2 path format', 400);
        }

        const [publisher, subject, gradeStr, volStr] = parts;
        const grade = parseInt(gradeStr.replace('grade', ''));
        const volume = parseInt(volStr.replace('vol', ''));

        return { publisher, subject, grade, volume };
    }

    /**
     * 处理上传的 PDF 文件
     * 使用 waitUntil 异步处理，立即返回
     */
    async processPdfAsync(c: Context, key: string): Promise<void> {
        // 更新状态为 processing
        const metadata = this.parseR2Path(key);
        await this.updateCatalogStatus(key, 'processing');

        try {
            // 1. 从 R2 读取 PDF
            const pdfObject = await this.env.TEXTBOOKS.get(key);
            if (!pdfObject) {
                throw new AppError('PDF not found in R2', 404);
            }

            // 2. 使用 AI 识别目录结构
            const pdfBuffer = await pdfObject.arrayBuffer();
            const chapters = await this.extractTableOfContents(pdfBuffer);

            // 3. 为每个章节创建目录记录并向量化
            for (const chapter of chapters) {
                await this.processChapter(key, metadata, chapter, pdfBuffer);
            }

            // 4. 更新状态为 ready
            await this.updateCatalogStatus(key, 'ready');
        } catch (error) {
            console.error('PDF processing error:', error);
            await this.updateCatalogStatus(key, 'error');
            throw error;
        }
    }

    /**
     * 使用 AI 提取教材目录结构
     */
    private async extractTableOfContents(pdfBuffer: ArrayBuffer): Promise<ChapterInfo[]> {
        // 调用 DashScope API 进行 OCR
        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            throw new AppError('DASHSCOPE_API_KEY not configured', 500);
        }

        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer.slice(0, 100000))));

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen3-VL-8B-Instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
                        {
                            type: 'text', text: `请分析这本教材的目录页，提取所有单元和课时信息。
返回JSON格式: [{"unit": "第一单元 xxx", "lesson": "第1课 xxx", "startPage": 1, "endPage": 15}, ...]
如果无法识别目录，返回空数组 []` }
                    ]
                }]
            })
        });

        if (!response.ok) {
            console.error('AI API error:', await response.text());
            // 如果无法识别目录，返回整本书作为一个章节
            return [{ unit: '全书', startPage: 1, endPage: 999 }];
        }

        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Failed to parse TOC JSON:', e);
        }

        return [{ unit: '全书', startPage: 1, endPage: 999 }];
    }

    /**
     * 处理单个章节：向量化并存入数据库
     */
    private async processChapter(
        r2Path: string,
        metadata: TextbookMetadata,
        chapter: ChapterInfo,
        pdfBuffer: ArrayBuffer
    ): Promise<void> {
        // 简化处理：将章节信息转为文本并向量化
        const chapterText = `${metadata.subject} ${metadata.grade}年级 ${metadata.volume === 1 ? '上' : '下'}册 ${chapter.unit} ${chapter.lesson || ''}`;

        // 生成向量嵌入
        const embeddings = await this.env.AI.run('@cf/baai/bge-m3', {
            text: [chapterText]
        }) as { data: number[][] };

        // 存入 Vectorize
        const vectorId = `${r2Path}-${chapter.unit}`.replace(/[^a-zA-Z0-9-]/g, '_');
        await this.env.VECTORIZE.insert([{
            id: vectorId,
            values: embeddings.data[0],
            metadata: {
                r2Path,
                unit: chapter.unit,
                lesson: chapter.lesson || '',
                subject: metadata.subject,
                grade: String(metadata.grade),
                volume: String(metadata.volume)
            }
        }]);

        // 存入 D1
        await this.env.DB.prepare(`
      INSERT INTO textbook_catalog 
        (publisher, subject, grade, volume, unit_name, lesson_name, r2_path, page_start, page_end, vectorize_ids, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')
    `).bind(
            metadata.publisher,
            metadata.subject,
            metadata.grade,
            metadata.volume,
            chapter.unit,
            chapter.lesson || null,
            r2Path,
            chapter.startPage,
            chapter.endPage,
            JSON.stringify([vectorId])
        ).run();
    }

    /**
     * 更新目录状态
     */
    private async updateCatalogStatus(r2Path: string, status: string): Promise<void> {
        await this.env.DB.prepare(`
      UPDATE textbook_catalog SET status = ? WHERE r2_path = ?
    `).bind(status, r2Path).run();
    }

    /**
     * 获取教材目录树
     */
    async getCatalog(subject?: string, grade?: number): Promise<any[]> {
        let query = 'SELECT * FROM textbook_catalog WHERE status = ?';
        const params: any[] = ['ready'];

        if (subject) {
            query += ' AND subject = ?';
            params.push(subject);
        }
        if (grade) {
            query += ' AND grade = ?';
            params.push(grade);
        }

        query += ' ORDER BY grade, volume, id';
        const result = await this.env.DB.prepare(query).bind(...params).all();
        return result.results || [];
    }
}
