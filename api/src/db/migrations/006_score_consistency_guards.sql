-- Enforce score consistency with exam definition and class ownership

CREATE TRIGGER IF NOT EXISTS trg_scores_validate_insert
BEFORE INSERT ON scores
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN NOT EXISTS (
                SELECT 1
                FROM exam_courses ec
                WHERE ec.exam_id = NEW.exam_id
                  AND ec.course_id = NEW.course_id
            )
            THEN RAISE(ABORT, 'Score course is not part of the exam')
        END;

    SELECT
        CASE
            WHEN NOT EXISTS (
                SELECT 1
                FROM students st
                JOIN exams e ON e.id = NEW.exam_id
                WHERE st.id = NEW.student_id
                  AND st.class_id = e.class_id
            )
            THEN RAISE(ABORT, 'Student does not belong to the exam class')
        END;

    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM exam_courses ec
                WHERE ec.exam_id = NEW.exam_id
                  AND ec.course_id = NEW.course_id
                  AND (NEW.score < 0 OR NEW.score > ec.full_score)
            )
            THEN RAISE(ABORT, 'Score is out of range for the exam course')
        END;
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_validate_update
BEFORE UPDATE OF student_id, exam_id, course_id, score ON scores
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN NOT EXISTS (
                SELECT 1
                FROM exam_courses ec
                WHERE ec.exam_id = NEW.exam_id
                  AND ec.course_id = NEW.course_id
            )
            THEN RAISE(ABORT, 'Score course is not part of the exam')
        END;

    SELECT
        CASE
            WHEN NOT EXISTS (
                SELECT 1
                FROM students st
                JOIN exams e ON e.id = NEW.exam_id
                WHERE st.id = NEW.student_id
                  AND st.class_id = e.class_id
            )
            THEN RAISE(ABORT, 'Student does not belong to the exam class')
        END;

    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM exam_courses ec
                WHERE ec.exam_id = NEW.exam_id
                  AND ec.course_id = NEW.course_id
                  AND (NEW.score < 0 OR NEW.score > ec.full_score)
            )
            THEN RAISE(ABORT, 'Score is out of range for the exam course')
        END;
END;
