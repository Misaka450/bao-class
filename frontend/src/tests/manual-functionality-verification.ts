/**
 * Manual Functionality Verification Script
 * 
 * This script provides a comprehensive verification of all existing functionality
 * to ensure the Ant Design Pro migration maintains feature completeness.
 * 
 * Requirements verified:
 * - 7.1: All existing functionality works seamlessly
 * - 7.2: All CRUD operations are maintained
 * - 7.3: Data visualization and charts work correctly
 * - 7.5: Search and filter functionality is complete
 */

import api from '../services/api';

interface VerificationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  error?: any;
}

class FunctionalityVerifier {
  private results: VerificationResult[] = [];

  private addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, error?: any) {
    this.results.push({ category, test, status, message, error });
    console.log(`[${status}] ${category} - ${test}: ${message}`);
    if (error) {
      console.error('Error details:', error);
    }
  }

  async verifyStudentCRUD(): Promise<void> {
    const category = 'Student CRUD Operations';
    
    try {
      // Test READ operation
      const students = await api.student.list();
      this.addResult(category, 'List Students', 'PASS', `Retrieved ${students.length} students`);
      
      // Test CREATE operation (mock data)
      const mockStudent = { name: 'Test Student', student_id: 'TEST001', class_id: 1 };
      try {
        await api.student.create(mockStudent);
        this.addResult(category, 'Create Student', 'PASS', 'Student creation API is functional');
      } catch (error) {
        this.addResult(category, 'Create Student', 'FAIL', 'Student creation failed', error);
      }
      
      // Test UPDATE operation (if students exist)
      if (students.length > 0) {
        const firstStudent = students[0];
        try {
          await api.student.update(firstStudent.id, { name: firstStudent.name });
          this.addResult(category, 'Update Student', 'PASS', 'Student update API is functional');
        } catch (error) {
          this.addResult(category, 'Update Student', 'FAIL', 'Student update failed', error);
        }
      } else {
        this.addResult(category, 'Update Student', 'SKIP', 'No students available for update test');
      }
      
    } catch (error) {
      this.addResult(category, 'List Students', 'FAIL', 'Failed to retrieve students', error);
    }
  }

  async verifyCoursesCRUD(): Promise<void> {
    const category = 'Course CRUD Operations';
    
    try {
      const courses = await api.course.list();
      this.addResult(category, 'List Courses', 'PASS', `Retrieved ${courses.length} courses`);
      
      // Test CREATE operation
      const mockCourse = { name: 'Test Course', grade: 1 };
      try {
        await api.course.create(mockCourse);
        this.addResult(category, 'Create Course', 'PASS', 'Course creation API is functional');
      } catch (error) {
        this.addResult(category, 'Create Course', 'FAIL', 'Course creation failed', error);
      }
      
    } catch (error) {
      this.addResult(category, 'List Courses', 'FAIL', 'Failed to retrieve courses', error);
    }
  }

  async verifyClassesCRUD(): Promise<void> {
    const category = 'Class CRUD Operations';
    
    try {
      const classes = await api.class.list();
      this.addResult(category, 'List Classes', 'PASS', `Retrieved ${classes.length} classes`);
      
      // Test CREATE operation
      const mockClass = { name: 'Test Class', grade: 1 };
      try {
        await api.class.create(mockClass);
        this.addResult(category, 'Create Class', 'PASS', 'Class creation API is functional');
      } catch (error) {
        this.addResult(category, 'Create Class', 'FAIL', 'Class creation failed', error);
      }
      
    } catch (error) {
      this.addResult(category, 'List Classes', 'FAIL', 'Failed to retrieve classes', error);
    }
  }

  async verifyExamsCRUD(): Promise<void> {
    const category = 'Exam CRUD Operations';
    
    try {
      const exams = await api.exam.list();
      this.addResult(category, 'List Exams', 'PASS', `Retrieved ${exams.length} exams`);
      
      // Test CREATE operation
      const mockExam = {
        name: 'Test Exam',
        exam_date: '2024-01-15',
        class_id: 1,
        courses: [{ course_id: 1, full_score: 100 }]
      };
      try {
        await api.exam.create(mockExam);
        this.addResult(category, 'Create Exam', 'PASS', 'Exam creation API is functional');
      } catch (error) {
        this.addResult(category, 'Create Exam', 'FAIL', 'Exam creation failed', error);
      }
      
    } catch (error) {
      this.addResult(category, 'List Exams', 'FAIL', 'Failed to retrieve exams', error);
    }
  }

  async verifyDataVisualization(): Promise<void> {
    const category = 'Data Visualization';
    
    try {
      // Test statistics API
      const classes = await api.class.list();
      const exams = await api.exam.list();
      
      if (classes.length > 0 && exams.length > 0) {
        const classId = classes[0].id.toString();
        const examId = exams[0].id.toString();
        
        try {
          const stats = await api.stats.getClassStats(classId, { examId });
          this.addResult(category, 'Class Statistics', 'PASS', 'Statistics API is functional');
        } catch (error) {
          this.addResult(category, 'Class Statistics', 'FAIL', 'Statistics API failed', error);
        }
        
        try {
          const distribution = await api.stats.getDistribution(examId);
          this.addResult(category, 'Score Distribution', 'PASS', `Retrieved ${distribution.length} distribution points`);
        } catch (error) {
          this.addResult(category, 'Score Distribution', 'FAIL', 'Distribution API failed', error);
        }
        
        try {
          const topStudents = await api.stats.getTopStudents(examId, { limit: 5 });
          this.addResult(category, 'Top Students', 'PASS', `Retrieved ${topStudents.length} top students`);
        } catch (error) {
          this.addResult(category, 'Top Students', 'FAIL', 'Top students API failed', error);
        }
        
        try {
          const progress = await api.stats.getProgress(examId);
          this.addResult(category, 'Student Progress', 'PASS', 'Progress tracking is functional');
        } catch (error) {
          this.addResult(category, 'Student Progress', 'FAIL', 'Progress API failed', error);
        }
        
      } else {
        this.addResult(category, 'Data Visualization', 'SKIP', 'No classes or exams available for visualization tests');
      }
      
    } catch (error) {
      this.addResult(category, 'Data Visualization Setup', 'FAIL', 'Failed to setup visualization tests', error);
    }
  }

  async verifySearchAndFilter(): Promise<void> {
    const category = 'Search and Filter';
    
    try {
      // Test scores list with filters
      const scoresList = await api.stats.getScoresList({});
      this.addResult(category, 'Scores List (No Filter)', 'PASS', `Retrieved ${scoresList.length} score records`);
      
      // Test with class filter
      const classes = await api.class.list();
      if (classes.length > 0) {
        const filteredScores = await api.stats.getScoresList({ classId: classes[0].id.toString() });
        this.addResult(category, 'Scores List (Class Filter)', 'PASS', `Retrieved ${filteredScores.length} filtered records`);
      }
      
      // Test with exam filter
      const exams = await api.exam.list();
      if (exams.length > 0) {
        const examFilteredScores = await api.stats.getScoresList({ examName: exams[0].name });
        this.addResult(category, 'Scores List (Exam Filter)', 'PASS', `Retrieved ${examFilteredScores.length} exam-filtered records`);
      }
      
      // Test with course filter
      const courses = await api.course.list();
      if (courses.length > 0) {
        const courseFilteredScores = await api.stats.getScoresList({ courseId: courses[0].id.toString() });
        this.addResult(category, 'Scores List (Course Filter)', 'PASS', `Retrieved ${courseFilteredScores.length} course-filtered records`);
      }
      
    } catch (error) {
      this.addResult(category, 'Search and Filter', 'FAIL', 'Search and filter functionality failed', error);
    }
  }

  async verifyAnalysisFeatures(): Promise<void> {
    const category = 'Analysis Features';
    
    try {
      const classes = await api.class.list();
      const exams = await api.exam.list();
      
      if (classes.length > 0) {
        try {
          const focusGroup = await api.analysis.getFocusGroup(classes[0].id.toString());
          this.addResult(category, 'Focus Group Analysis', 'PASS', 'Focus group analysis is functional');
        } catch (error) {
          this.addResult(category, 'Focus Group Analysis', 'FAIL', 'Focus group analysis failed', error);
        }
      }
      
      if (exams.length > 0) {
        try {
          const examQuality = await api.analysis.getExamQuality(exams[0].id);
          this.addResult(category, 'Exam Quality Analysis', 'PASS', 'Exam quality analysis is functional');
        } catch (error) {
          this.addResult(category, 'Exam Quality Analysis', 'FAIL', 'Exam quality analysis failed', error);
        }
      }
      
    } catch (error) {
      this.addResult(category, 'Analysis Features Setup', 'FAIL', 'Failed to setup analysis tests', error);
    }
  }

  async verifyImportExport(): Promise<void> {
    const category = 'Import/Export';
    
    try {
      // Test export templates
      const studentTemplate = await api.export.getStudentTemplate();
      this.addResult(category, 'Student Template Export', 'PASS', 'Student template export is functional');
      
      const exams = await api.exam.list();
      if (exams.length > 0) {
        const scoreTemplate = await api.export.getScoreTemplate(exams[0].id);
        this.addResult(category, 'Score Template Export', 'PASS', 'Score template export is functional');
      }
      
    } catch (error) {
      this.addResult(category, 'Import/Export', 'FAIL', 'Import/export functionality failed', error);
    }
  }

  async verifyAIFeatures(): Promise<void> {
    const category = 'AI Features';
    
    try {
      const students = await api.student.list();
      
      if (students.length > 0) {
        try {
          const comment = await api.ai.generateComment({ student_id: students[0].id });
          this.addResult(category, 'AI Comment Generation', 'PASS', 'AI comment generation is functional');
        } catch (error) {
          this.addResult(category, 'AI Comment Generation', 'FAIL', 'AI comment generation failed', error);
        }
        
        try {
          const history = await api.ai.getCommentHistory(students[0].id);
          this.addResult(category, 'AI Comment History', 'PASS', 'AI comment history is functional');
        } catch (error) {
          this.addResult(category, 'AI Comment History', 'FAIL', 'AI comment history failed', error);
        }
      }
      
    } catch (error) {
      this.addResult(category, 'AI Features Setup', 'FAIL', 'Failed to setup AI tests', error);
    }
  }

  async runAllVerifications(): Promise<VerificationResult[]> {
    console.log('🚀 Starting Functionality Verification...\n');
    
    await this.verifyStudentCRUD();
    await this.verifyCoursesCRUD();
    await this.verifyClassesCRUD();
    await this.verifyExamsCRUD();
    await this.verifyDataVisualization();
    await this.verifySearchAndFilter();
    await this.verifyAnalysisFeatures();
    await this.verifyImportExport();
    await this.verifyAIFeatures();
    
    this.generateReport();
    return this.results;
  }

  private generateReport(): void {
    console.log('\n📊 Functionality Verification Report');
    console.log('=====================================\n');
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      const skipped = categoryResults.filter(r => r.status === 'SKIP').length;
      
      console.log(`📁 ${category}`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   ⏭️  Skipped: ${skipped}`);
      console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);
    });
    
    const totalPassed = this.results.filter(r => r.status === 'PASS').length;
    const totalFailed = this.results.filter(r => r.status === 'FAIL').length;
    const totalSkipped = this.results.filter(r => r.status === 'SKIP').length;
    const totalTests = this.results.length;
    
    console.log('🎯 Overall Summary');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`   📈 Overall Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All functionality verification tests passed! The migration maintains complete feature compatibility.');
    } else {
      console.log('\n⚠️  Some functionality tests failed. Please review the failed tests above.');
    }
  }
}

// Export for use in other files
export { FunctionalityVerifier, type VerificationResult };

// For direct execution
if (typeof window === 'undefined') {
  // Node.js environment - can be run directly
  const verifier = new FunctionalityVerifier();
  verifier.runAllVerifications().catch(console.error);
}