// routes/instructor.js
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const { insertSampleQuestions } = require('../utils/lesson-quiz-samples');
const { validateUploadedFile } = require('../utils/upload-signatures');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();
router.use(requireRole('instructor'));
const UPLOADS_DIR = process.env.EDUVERSE_UPLOADS_DIR
  ? path.resolve(process.env.EDUVERSE_UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

const LESSON_UPLOADS_DIR = path.join(
  process.env.EDUVERSE_UPLOADS_DIR ? path.resolve(process.env.EDUVERSE_UPLOADS_DIR) : path.join(__dirname, '..', 'uploads'),
  'lessons'
);
fs.mkdirSync(LESSON_UPLOADS_DIR, { recursive: true });
const lessonUpload = multer({
  storage: multer.diskStorage({
    destination: LESSON_UPLOADS_DIR,
    filename: (req, file, callback) => callback(null, `${crypto.randomBytes(16).toString('hex')}.mp4`),
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== '.mp4' || file.mimetype !== 'video/mp4') {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    callback(null, true);
  },
});

async function ownedCourseOr404(req, res) {
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(req.params.id, req.session.user.id);
  if (!course) {
    res.status(404).render('error', { title: 'Course not found', message: "This course doesn't exist or isn't yours." });
    return null;
  }
  return course;
}

async function requireOwnedCourse(req, res, next) {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  req.ownedCourse = course;
  next();
}

async function courseAnalytics(courseId, students, lessonCount) {
  const quizStats = await db
    .prepare(
      `SELECT COUNT(*) AS attempts,
              ROUND(AVG(100.0 * quiz_attempts.score / NULLIF(quiz_attempts.total, 0)), 1) AS average_score
       FROM quiz_attempts JOIN quizzes ON quizzes.id = quiz_attempts.quiz_id
       WHERE quizzes.course_id = ?`
    )
    .get(courseId);
  const completionCounts = lessonCount === 0
    ? []
    : await Promise.all(students.map((student) => db
        .prepare(
          `SELECT COUNT(*) AS count FROM lesson_progress
           JOIN lessons ON lessons.id = lesson_progress.lesson_id
           WHERE lesson_progress.student_id = ? AND lessons.course_id = ?`
        )
        .get(student.id, courseId)));
  const fullyCompleted = completionCounts.filter((result) => result.count >= lessonCount).length;

  return {
    quizAttempts: quizStats.attempts,
    averageQuizScore: quizStats.average_score,
    completionRate: students.length ? Math.round((fullyCompleted / students.length) * 100) : 0,
  };
}

router.get('/dashboard', async (req, res) => {
  const instructorId = req.session.user.id;
  const [courses, totalStudentCount, pendingSubmissionCount] = await Promise.all([
    db
    .prepare(
      `SELECT courses.*,
              (SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = courses.id) AS enrolled_count,
              (SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id) AS lesson_count
       FROM courses WHERE instructor_id = ? ORDER BY created_at DESC`
    )
      .all(instructorId),

    db
    .prepare(
      `SELECT COUNT(DISTINCT enrollments.student_id) c FROM enrollments
       JOIN courses ON courses.id = enrollments.course_id WHERE courses.instructor_id = ?`
    )
      .get(instructorId),

    db
    .prepare(
      `SELECT COUNT(*) c FROM submissions
       JOIN assignments ON assignments.id = submissions.assignment_id
       JOIN courses ON courses.id = assignments.course_id
       WHERE courses.instructor_id = ? AND submissions.grade IS NULL`
    )
      .get(instructorId),
  ]);
  const totalStudents = totalStudentCount.c;
  const pendingSubmissions = pendingSubmissionCount.c;

  res.render('instructor/dashboard', { title: 'Instructor Dashboard', courses, totalStudents, pendingSubmissions });
});

router.get('/courses/new', (req, res) => {
  res.render('instructor/course-form', { title: 'New Course', course: null, error: null });
});

router.post('/courses', async (req, res) => {
  const { title, description, category, level, cover_color } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).render('instructor/course-form', { title: 'New Course', course: null, error: 'Course title is required.' });
  }
  const info = await db
    .prepare(
      `INSERT INTO courses (title, description, category, level, cover_color, instructor_id, status)
       VALUES (?,?,?,?,?,?, 'pending')`
    )
    .run(title.trim(), description || '', category || 'General', level || 'Beginner', cover_color || '#3D5AFE', req.session.user.id);
  res.redirect(`/instructor/courses/${info.lastInsertRowid}`);
});

router.get('/courses/:id/edit', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  res.render('instructor/course-form', { title: 'Edit Course', course, error: null });
});

router.post('/courses/:id/edit', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  const { title, description, category, level, cover_color } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).render('instructor/course-form', { title: 'Edit Course', course, error: 'Course title is required.' });
  }
  await db.prepare(`UPDATE courses SET title=?, description=?, category=?, level=?, cover_color=? WHERE id=?`).run(
    title.trim(), description || '', category || 'General', level || 'Beginner', cover_color || '#3D5AFE', course.id
  );
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/courses/:id/publish', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  const lessonCount = (await db.prepare('SELECT COUNT(*) c FROM lessons WHERE course_id = ?').get(course.id)).c;
  if (lessonCount === 0) {
    return res.status(400).render('error', { title: 'Cannot publish', message: 'Add at least one lesson before publishing this course.' });
  }
  await db.prepare("UPDATE courses SET status = 'published' WHERE id = ?").run(course.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/courses/:id/unpublish', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  await db.prepare("UPDATE courses SET status = 'pending' WHERE id = ?").run(course.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/courses/:id/delete', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  await db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
  res.redirect('/instructor/dashboard');
});

router.get('/courses/:id', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;

  const [lessons, quiz, assignments, students, submissions] = await Promise.all([
    db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position ASC').all(course.id),
    db.prepare('SELECT * FROM quizzes WHERE course_id = ? AND lesson_id IS NULL').get(course.id),
    db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(course.id),
    db
    .prepare(
      `SELECT users.id, users.name, users.email, enrollments.enrolled_at, enrollments.certificate_issued
       FROM enrollments JOIN users ON users.id = enrollments.student_id
       WHERE enrollments.course_id = ? ORDER BY enrollments.enrolled_at DESC`
    )
      .all(course.id),
    db
    .prepare(
      `SELECT submissions.*, users.name AS student_name, assignments.title AS assignment_title
       FROM submissions
       JOIN users ON users.id = submissions.student_id
       JOIN assignments ON assignments.id = submissions.assignment_id
       WHERE assignments.course_id = ? ORDER BY submissions.submitted_at DESC`
    )
      .all(course.id),
  ]);
  const [questions, analytics] = await Promise.all([
    quiz ? db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(quiz.id) : [],
    courseAnalytics(course.id, students, lessons.length),
  ]);

  res.render('instructor/course-manage', {
    title: course.title,
    course,
    lessons,
    quiz,
    questions,
    assignments,
    students,
    submissions,
    analytics,
  });
});

// -- Lessons ------------------------------------------------------------
router.post('/courses/:id/lessons', requireOwnedCourse, lessonUpload.single('video'), validateUploadedFile, async (req, res, next) => {
  const course = req.ownedCourse;
  const { title, video_url, content } = req.body;
  if (!title || !title.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).render('error', { title: 'Lesson title required', message: 'Enter a lesson title before adding the lesson.' });
  }
  if (req.body.video_url && !/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\//i.test(req.body.video_url.trim())) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).render('error', { title: 'Unsupported video URL', message: 'Use a YouTube embed URL or upload an MP4 video.' });
  }
  if (req.file && req.body.video_url) {
    fs.unlinkSync(req.file.path);
    return res.status(400).render('error', { title: 'Choose one video source', message: 'Upload an MP4 or provide an embed URL, not both.' });
  }
  const position = (await db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM lessons WHERE course_id = ?').get(course.id)).pos;
  const storedVideoUrl = req.file ? `upload:${req.file.filename}` : (video_url || '');
  try {
    if (db.dialect === 'mysql') {
      await db.transaction(async (tx) => {
        const lesson = await tx.prepare('INSERT INTO lessons (course_id, title, video_url, content, position) VALUES (?,?,?,?,?)').run(
          course.id, title.trim(), storedVideoUrl, content || '', position
        );
        const quiz = await tx.prepare('INSERT INTO quizzes (course_id, lesson_id, title) VALUES (?,?,?)')
          .run(course.id, lesson.lastInsertRowid, `Quiz for ${title.trim()}`);
        await insertSampleQuestions(tx, quiz.lastInsertRowid, title.trim());
      })();
    } else {
      db.transaction(() => {
        const lesson = db.prepare('INSERT INTO lessons (course_id, title, video_url, content, position) VALUES (?,?,?,?,?)').run(
          course.id, title.trim(), storedVideoUrl, content || '', position
        );
        const quiz = db.prepare('INSERT INTO quizzes (course_id, lesson_id, title) VALUES (?,?,?)')
          .run(course.id, lesson.lastInsertRowid, `Quiz for ${title.trim()}`);
        insertSampleQuestions(db, quiz.lastInsertRowid, title.trim());
      })();
    }
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return next(error);
  }
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/lessons/:lessonId/delete', async (req, res) => {
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).render('error', { title: 'Not found', message: 'Lesson not found.' });
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(lesson.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });
  await db.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

// -- Quiz -----------------------------------------------------------------
router.post('/courses/:id/quiz', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  const existing = await db.prepare('SELECT * FROM quizzes WHERE course_id = ? AND lesson_id IS NULL').get(course.id);
  if (existing) return res.redirect(`/instructor/courses/${course.id}`);
  const { quiz_title } = req.body;
  await db.prepare('INSERT INTO quizzes (course_id, title) VALUES (?,?)').run(course.id, quiz_title || `${course.title} Quiz`);
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/quizzes/:quizId/questions', async (req, res) => {
  const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) return res.status(404).render('error', { title: 'Not found', message: 'Quiz not found.' });
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(quiz.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });

  const { question, option_a, option_b, option_c, option_d, correct_option } = req.body;
  if (!question || !option_a || !option_b || !option_c || !option_d || !correct_option) {
    return res.redirect(`/instructor/courses/${course.id}`);
  }
  await db.prepare(
    `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
     VALUES (?,?,?,?,?,?,?)`
  ).run(quiz.id, question.trim(), option_a, option_b, option_c, option_d, correct_option);
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/questions/:questionId/delete', async (req, res) => {
  const question = await db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(req.params.questionId);
  if (!question) return res.status(404).render('error', { title: 'Not found', message: 'Question not found.' });
  const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ?').get(question.quiz_id);
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(quiz.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });
  await db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(question.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

// -- Assignments ------------------------------------------------------------
router.post('/courses/:id/assignments', async (req, res) => {
  const course = await ownedCourseOr404(req, res);
  if (!course) return;
  const { title, instructions, due_date } = req.body;
  if (!title || !title.trim()) return res.redirect(`/instructor/courses/${course.id}`);
  await db.prepare('INSERT INTO assignments (course_id, title, instructions, due_date) VALUES (?,?,?,?)').run(
    course.id, title.trim(), instructions || '', due_date || null
  );
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/assignments/:assignmentId/delete', async (req, res) => {
  const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.assignmentId);
  if (!assignment) return res.status(404).render('error', { title: 'Not found', message: 'Assignment not found.' });
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(assignment.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });
  await db.prepare('DELETE FROM assignments WHERE id = ?').run(assignment.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

router.post('/submissions/:submissionId/grade', async (req, res) => {
  const submission = await db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.submissionId);
  if (!submission) return res.status(404).render('error', { title: 'Not found', message: 'Submission not found.' });
  const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(submission.assignment_id);
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(assignment.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });

  const { grade, feedback } = req.body;
  const gradeNum = grade === '' || grade === undefined ? null : Math.max(0, Math.min(100, parseInt(grade, 10)));
  await db.prepare('UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?').run(gradeNum, feedback || '', submission.id);
  res.redirect(`/instructor/courses/${course.id}`);
});

// Download a student's submitted file
router.get('/submissions/:submissionId/download', async (req, res) => {
  const submission = await db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.submissionId);
  if (!submission) return res.status(404).render('error', { title: 'Not found', message: 'Submission not found.' });
  const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(submission.assignment_id);
  const course = await db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?').get(assignment.course_id, req.session.user.id);
  if (!course) return res.status(403).render('error', { title: 'Access denied', message: 'Not your course.' });

  const filePath = path.join(UPLOADS_DIR, 'assignments', submission.stored_name);
  res.download(filePath, submission.file_name);
});

module.exports = router;
