// routes/student.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { streamCertificate } = require('../utils/certificate');
const { videoDirectory } = require('../utils/ccna-videos');
const { validateUploadedFile } = require('../utils/upload-signatures');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();
router.use(requireRole('student'));
const unlink = promisify(fs.unlink);
const UPLOADS_DIR = process.env.EDUVERSE_UPLOADS_DIR
  ? path.resolve(process.env.EDUVERSE_UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

router.get('/lessons/:lessonId/video', async (req, res) => {
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson || (!lesson.video_url.startsWith('local:') && !lesson.video_url.startsWith('upload:'))) {
    return res.status(404).render('error', { title: 'Video not found', message: 'This video is not available.' });
  }

  const enrolled = await db
    .prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(req.session.user.id, lesson.course_id);
  if (!enrolled) {
    return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });
  }

  const isUploaded = lesson.video_url.startsWith('upload:');
  const videoRoot = isUploaded
    ? path.join(UPLOADS_DIR, 'lessons')
    : path.resolve(videoDirectory);
  const relativePath = lesson.video_url.slice(isUploaded ? 'upload:'.length : 'local:'.length);
  const videoPath = path.resolve(videoRoot, relativePath);
  if (!videoPath.startsWith(`${videoRoot}${path.sep}`) || !fs.existsSync(videoPath)) {
    return res.status(404).render('error', { title: 'Video not found', message: 'This video file is missing.' });
  }

  res.type('video/mp4');
  return res.sendFile(videoPath);
});

// -- File upload config for assignment submissions --------------------------
const storage = multer.diskStorage({
  destination: path.join(UPLOADS_DIR, 'assignments'),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Map([
      ['.pdf', ['application/pdf']],
      ['.doc', ['application/msword', 'application/octet-stream']],
      ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
      ['.ppt', ['application/vnd.ms-powerpoint', 'application/octet-stream']],
      ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream']],
      ['.txt', ['text/plain', 'application/octet-stream']],
      ['.zip', ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']],
      ['.png', ['image/png']],
      ['.jpg', ['image/jpeg']],
      ['.jpeg', ['image/jpeg']],
    ]);
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = allowedTypes.get(extension);
    cb(null, !!allowedMimeTypes && allowedMimeTypes.includes(file.mimetype));
  },
});

async function validateAssignmentSubmission(req, res, next) {
  const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.assignmentId);
  if (!assignment) return res.status(404).render('error', { title: 'Not found', message: 'Assignment not found.' });

  const enrolled = await db
    .prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(req.session.user.id, assignment.course_id);
  if (!enrolled) return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });

  if (assignment.due_date) {
    const deadline = new Date(`${assignment.due_date}T23:59:59.999Z`);
    if (Number.isNaN(deadline.getTime())) {
      return next(new Error(`Invalid assignment due date stored for assignment ${assignment.id}.`));
    }
    if (Date.now() > deadline.getTime()) {
      return res.status(400).render('error', { title: 'Deadline passed', message: 'This assignment is no longer accepting submissions.' });
    }
  }

  req.assignment = assignment;
  next();
}

function courseProgress(studentId, courseId, targetDb = db) {
  if (targetDb.dialect === 'mysql') {
    return (async () => {
      const totalLessons = (await targetDb.prepare('SELECT COUNT(*) c FROM lessons WHERE course_id = ?').get(courseId)).c;
      if (totalLessons === 0) return 0;
      const completed = (await targetDb
        .prepare(
          `SELECT COUNT(*) c FROM lesson_progress
           JOIN lessons ON lessons.id = lesson_progress.lesson_id
           WHERE lesson_progress.student_id = ? AND lessons.course_id = ?`
        )
        .get(studentId, courseId)).c;
      return Math.round((completed / totalLessons) * 100);
    })();
  }

  const totalLessons = targetDb.prepare('SELECT COUNT(*) c FROM lessons WHERE course_id = ?').get(courseId).c;
  if (totalLessons === 0) return 0;
  const completed = targetDb
    .prepare(
      `SELECT COUNT(*) c FROM lesson_progress
       JOIN lessons ON lessons.id = lesson_progress.lesson_id
       WHERE lesson_progress.student_id = ? AND lessons.course_id = ?`
    )
    .get(studentId, courseId).c;
  return Math.round((completed / totalLessons) * 100);
}

router.get('/dashboard', async (req, res) => {
  const studentId = req.session.user.id;
  const courseRows = await db
    .prepare(
      `SELECT courses.*, enrollments.certificate_issued
       FROM enrollments JOIN courses ON courses.id = enrollments.course_id
       WHERE enrollments.student_id = ? ORDER BY enrollments.enrolled_at DESC`
    )
    .all(studentId);
  const enrollments = await Promise.all(courseRows.map(async (course) => {
      const [latestQuizAttempt, progress] = await Promise.all([
        db
        .prepare(
          `SELECT quiz_attempts.score, quiz_attempts.total
           FROM quiz_attempts JOIN quizzes ON quizzes.id = quiz_attempts.quiz_id
           WHERE quiz_attempts.student_id = ? AND quizzes.course_id = ?
           ORDER BY quiz_attempts.taken_at DESC, quiz_attempts.id DESC LIMIT 1`
        )
        .get(studentId, course.id),
        courseProgress(studentId, course.id),
      ]);
      return {
        ...course,
        progress,
        latestQuizAttempt,
      };
    }));

  const inProgress = enrollments.filter((c) => c.progress < 100).length;
  const completed = enrollments.filter((c) => c.progress === 100).length;

  res.render('student/dashboard', {
    title: 'My Learning',
    enrollments,
    inProgress,
    completed,
  });
});

router.post('/courses/:id/enroll', async (req, res) => {
  const courseId = req.params.id;
  const course = await db.prepare("SELECT * FROM courses WHERE id = ? AND status='published'").get(courseId);
  if (!course) return res.status(404).render('error', { title: 'Course not found', message: 'This course is not available.' });

  await db.prepare('INSERT OR IGNORE INTO enrollments (student_id, course_id) VALUES (?,?)').run(req.session.user.id, courseId);
  res.redirect(`/student/courses/${courseId}`);
});

router.get('/courses/:id', async (req, res) => {
  const studentId = req.session.user.id;
  const courseId = req.params.id;

  const enrollment = await db.prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
  if (!enrollment) return res.redirect(`/courses/${courseId}`);

  const course = await db
    .prepare(`SELECT courses.*, users.name AS instructor_name FROM courses JOIN users ON users.id = courses.instructor_id WHERE courses.id = ?`)
    .get(courseId);
  const [lessons, completedRows, watchedRows, lessonQuizzes, quiz, assignments, submissions, progress] = await Promise.all([
    db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position ASC').all(courseId),
    db
      .prepare(`SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)`)
      .all(studentId, courseId),
    db.prepare('SELECT lesson_id FROM lesson_watches WHERE student_id = ?').all(studentId),
    db
    .prepare(
      `SELECT quizzes.*, COUNT(quiz_questions.id) AS question_count,
         (SELECT score FROM quiz_attempts
          WHERE quiz_id = quizzes.id AND student_id = ?
          ORDER BY id DESC LIMIT 1) AS last_score,
         (SELECT total FROM quiz_attempts
          WHERE quiz_id = quizzes.id AND student_id = ?
          ORDER BY id DESC LIMIT 1) AS last_total
       FROM quizzes
       LEFT JOIN quiz_questions ON quiz_questions.quiz_id = quizzes.id
       WHERE quizzes.course_id = ? AND quizzes.lesson_id IS NOT NULL
       GROUP BY quizzes.id`
    )
      .all(studentId, studentId, courseId),
    db.prepare('SELECT * FROM quizzes WHERE course_id = ? AND lesson_id IS NULL').get(courseId),
    db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(courseId),
    db
      .prepare(`SELECT * FROM submissions WHERE student_id = ? AND assignment_id IN (SELECT id FROM assignments WHERE course_id = ?)`)
      .all(studentId, courseId),
    courseProgress(studentId, courseId),
  ]);
  const completedIds = new Set(completedRows.map((r) => r.lesson_id));
  const watchedIds = new Set(watchedRows.map((r) => r.lesson_id));
  const quizByLesson = new Map(lessonQuizzes.map((lessonQuiz) => [lessonQuiz.lesson_id, lessonQuiz]));
  const lessonsWithQuizzes = lessons.map((lesson) => ({
    ...lesson,
    quiz: quizByLesson.get(lesson.id) || null,
  }));
  const quizAttempt = quiz ? await db.prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY taken_at DESC LIMIT 1').get(quiz.id, studentId) : null;
  const submissionByAssignment = Object.fromEntries(submissions.map((s) => [s.assignment_id, s]));

  res.render('student/course', {
    title: course.title,
    course,
    lessons: lessonsWithQuizzes,
    completedIds,
    watchedIds,
    quiz,
    quizAttempt,
    assignments,
    submissionByAssignment,
    progress,
    enrollment,
  });
});

router.post('/lessons/:lessonId/watched', async (req, res) => {
  const studentId = req.session.user.id;
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).render('error', { title: 'Not found', message: 'Lesson not found.' });

  const enrolled = await db.prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, lesson.course_id);
  if (!enrolled) return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });

  if (!lesson.video_url) {
    return res.status(400).render('error', { title: 'Video unavailable', message: 'This lesson has no video to complete.' });
  }

  await db.prepare('INSERT OR IGNORE INTO lesson_watches (student_id, lesson_id) VALUES (?,?)').run(studentId, lesson.id);
  res.redirect(`/student/courses/${lesson.course_id}`);
});

router.get('/quizzes/:quizId', async (req, res) => {
  const studentId = req.session.user.id;
  const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) return res.status(404).render('error', { title: 'Not found', message: 'Quiz not found.' });

  const enrolled = await db.prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, quiz.course_id);
  if (!enrolled) return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });

  if (quiz.lesson_id) {
    const [watched, completed] = await Promise.all([
      db.prepare('SELECT 1 FROM lesson_watches WHERE student_id = ? AND lesson_id = ?').get(studentId, quiz.lesson_id),
      db.prepare('SELECT 1 FROM lesson_progress WHERE student_id = ? AND lesson_id = ?').get(studentId, quiz.lesson_id),
    ]);
    if (!watched && !completed) return res.redirect(`/student/courses/${quiz.course_id}`);
  }

  const questions = await db.prepare('SELECT id, question, option_a, option_b, option_c, option_d, source FROM quiz_questions WHERE quiz_id = ?').all(quiz.id);
  if (quiz.lesson_id && questions.length < 20) {
    return res.status(409).render('error', {
      title: 'Quiz not ready',
      message: 'This lesson quiz needs at least 20 questions before students can take it.',
    });
  }
  const quizAttempt = await db.prepare('SELECT score, total FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY id DESC LIMIT 1').get(quiz.id, studentId);
  res.render('student/quiz', {
    title: quiz.title,
    quiz,
    questions,
    quizAttempt,
    hasSampleQuestions: questions.some((question) => question.source === 'sample'),
  });
});

router.post('/quizzes/:quizId/submit', async (req, res) => {
  const studentId = req.session.user.id;
  const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) return res.status(404).render('error', { title: 'Not found', message: 'Quiz not found.' });

  const enrolled = await db.prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, quiz.course_id);
  if (!enrolled) return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });

  if (quiz.lesson_id) {
    const [watched, completed] = await Promise.all([
      db.prepare('SELECT 1 FROM lesson_watches WHERE student_id = ? AND lesson_id = ?').get(studentId, quiz.lesson_id),
      db.prepare('SELECT 1 FROM lesson_progress WHERE student_id = ? AND lesson_id = ?').get(studentId, quiz.lesson_id),
    ]);
    if (!watched && !completed) return res.status(403).render('error', { title: 'Watch required', message: 'Watch the lesson video before taking its quiz.' });
  }

  const questions = await db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(quiz.id);
  if (quiz.lesson_id && questions.length < 20) {
    return res.status(409).render('error', {
      title: 'Quiz not ready',
      message: 'This lesson quiz needs at least 20 questions before students can take it.',
    });
  }
  if (questions.some((question) => !['a', 'b', 'c', 'd'].includes(req.body[`q_${question.id}`]))) {
    return res.status(400).render('error', {
      title: 'Answers required',
      message: 'Answer every question before submitting the quiz.',
    });
  }

  let score = 0;
  for (const q of questions) {
    const answer = req.body[`q_${q.id}`];
    if (answer === q.correct_option) score += 1;
  }
  const passed = score * 100 >= questions.length * 40;
  if (db.dialect === 'mysql') {
    await db.transaction(async (tx) => {
      await tx.prepare('INSERT INTO quiz_attempts (quiz_id, student_id, score, total) VALUES (?,?,?,?)')
        .run(quiz.id, studentId, score, questions.length);
      if (quiz.lesson_id && passed) {
        await tx.prepare('INSERT OR IGNORE INTO lesson_progress (student_id, lesson_id) VALUES (?,?)')
          .run(studentId, quiz.lesson_id);
        if (await courseProgress(studentId, quiz.course_id, tx) === 100) {
          await tx.prepare('UPDATE enrollments SET certificate_issued = 1 WHERE student_id = ? AND course_id = ?')
            .run(studentId, quiz.course_id);
        }
      }
    })();
  } else {
    db.transaction(() => {
      db.prepare('INSERT INTO quiz_attempts (quiz_id, student_id, score, total) VALUES (?,?,?,?)')
        .run(quiz.id, studentId, score, questions.length);
      if (quiz.lesson_id && passed) {
        db.prepare('INSERT OR IGNORE INTO lesson_progress (student_id, lesson_id) VALUES (?,?)')
          .run(studentId, quiz.lesson_id);
        if (courseProgress(studentId, quiz.course_id) === 100) {
          db.prepare('UPDATE enrollments SET certificate_issued = 1 WHERE student_id = ? AND course_id = ?')
            .run(studentId, quiz.course_id);
        }
      }
    })();
  }

  res.redirect(`/student/courses/${quiz.course_id}`);
});

router.post('/assignments/:assignmentId/submit', validateAssignmentSubmission, upload.single('file'), validateUploadedFile, async (req, res, next) => {
  const studentId = req.session.user.id;
  const assignment = req.assignment;

  if (!req.file) {
    return res.status(400).render('error', {
      title: 'Upload required',
      message: 'Choose a supported PDF, Office document, text, ZIP, or image no larger than 15 MB.',
    });
  }

  const previous = await db
    .prepare('SELECT stored_name FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignment.id, studentId);
  try {
    const statement = db.dialect === 'mysql'
      ? `INSERT INTO submissions (assignment_id, student_id, file_name, stored_name)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), stored_name = VALUES(stored_name),
           submitted_at = CURRENT_TIMESTAMP, grade = NULL, feedback = NULL`
      : `INSERT INTO submissions (assignment_id, student_id, file_name, stored_name)
         VALUES (?,?,?,?)
         ON CONFLICT(assignment_id, student_id) DO UPDATE SET
           file_name = excluded.file_name, stored_name = excluded.stored_name,
           submitted_at = datetime('now'), grade = NULL, feedback = NULL`;
    await db.prepare(statement).run(assignment.id, studentId, path.basename(req.file.originalname), req.file.filename);
  } catch (error) {
    await unlink(req.file.path).catch((cleanupError) => console.error('Unable to remove rejected assignment upload:', cleanupError));
    return next(error);
  }

  if (previous && previous.stored_name !== req.file.filename) {
    await unlink(path.join(UPLOADS_DIR, 'assignments', previous.stored_name))
      .catch((error) => console.error('Unable to remove replaced assignment upload:', error));
  }

  res.redirect(`/student/courses/${assignment.course_id}`);
});

router.get('/certificate/:courseId', async (req, res) => {
  const studentId = req.session.user.id;
  const courseId = req.params.courseId;

  const enrollment = await db.prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
  if (!enrollment) return res.status(403).render('error', { title: 'Access denied', message: 'Enroll in this course first.' });

  const progress = await courseProgress(studentId, courseId);
  if (progress < 100) {
    return res.status(400).render('error', { title: 'Not yet complete', message: 'Complete all lessons to unlock your certificate.' });
  }

  if (!enrollment.certificate_issued) {
    await db.prepare('UPDATE enrollments SET certificate_issued = 1 WHERE id = ?').run(enrollment.id);
  }

  const course = await db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId);
  const certId = `EV-${courseId}-${studentId}-${enrollment.id}`;
  streamCertificate(res, {
    studentName: req.session.user.name,
    courseTitle: course.title,
    dateStr: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certId,
  });
});

module.exports = router;
