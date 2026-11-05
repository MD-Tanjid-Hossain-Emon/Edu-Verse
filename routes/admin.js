// routes/admin.js
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();
router.use(requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const statQueries = [
    'SELECT COUNT(*) c FROM users',
    "SELECT COUNT(*) c FROM users WHERE role='student'",
    "SELECT COUNT(*) c FROM users WHERE role='instructor'",
    'SELECT COUNT(*) c FROM courses',
    "SELECT COUNT(*) c FROM courses WHERE status='published'",
    "SELECT COUNT(*) c FROM courses WHERE status='pending'",
    'SELECT COUNT(*) c FROM enrollments',
    'SELECT COUNT(*) c FROM enrollments WHERE certificate_issued = 1',
  ];
  const statRows = await Promise.all(statQueries.map((sql) => db.prepare(sql).get()));
  const [users, students, instructors, courses, published, pending, enrollments, certificates] = statRows.map((row) => row.c);
  const stats = { users, students, instructors, courses, published, pending, enrollments, certificates };
  const memoryUsage = process.memoryUsage();
  const runtime = {
    uptimeMinutes: Math.floor(process.uptime() / 60),
    heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    nodeVersion: process.version,
  };
  const [recentUsers, pendingCourses] = await Promise.all([
    db.prepare('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5').all(),
    db
    .prepare(
      `SELECT courses.*, users.name AS instructor_name FROM courses
       JOIN users ON users.id = courses.instructor_id
       WHERE courses.status = 'pending' ORDER BY courses.created_at DESC LIMIT 5`
    )
    .all(),
  ]);

  res.render('admin/dashboard', { title: 'Admin Dashboard', stats, runtime, recentUsers, pendingCourses });
});

router.get('/reports.csv', async (req, res) => {
  const summaryQueries = {
    users: 'SELECT COUNT(*) AS count FROM users',
    active_users: "SELECT COUNT(*) AS count FROM users WHERE status = 'active'",
    students: "SELECT COUNT(*) AS count FROM users WHERE role = 'student'",
    instructors: "SELECT COUNT(*) AS count FROM users WHERE role = 'instructor'",
    courses: 'SELECT COUNT(*) AS count FROM courses',
    published_courses: "SELECT COUNT(*) AS count FROM courses WHERE status = 'published'",
    pending_courses: "SELECT COUNT(*) AS count FROM courses WHERE status = 'pending'",
    enrollments: 'SELECT COUNT(*) AS count FROM enrollments',
    certificates_issued: 'SELECT COUNT(*) AS count FROM enrollments WHERE certificate_issued = 1',
  };
  const [summaryValues, courseRows, quizAttempts, assignmentSubmissions, ungradedSubmissions] = await Promise.all([
    Promise.all(Object.values(summaryQueries).map((sql) => db.prepare(sql).get())),
    db
      .prepare(
        `SELECT courses.title, COUNT(DISTINCT enrollments.student_id) AS enrollments,
                (SELECT COUNT(*) FROM enrollments e
                 WHERE e.course_id = courses.id
                   AND (SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id) > 0
                   AND (SELECT COUNT(*) FROM lesson_progress lp
                        JOIN lessons l ON l.id = lp.lesson_id
                        WHERE lp.student_id = e.student_id AND l.course_id = courses.id)
                       >= (SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id)) AS completed_students,
                (SELECT ROUND(AVG(100.0 * qa.score / NULLIF(qa.total, 0)), 1)
                 FROM quizzes q JOIN quiz_attempts qa ON qa.quiz_id = q.id
                 WHERE q.course_id = courses.id) AS average_quiz_score
         FROM courses LEFT JOIN enrollments ON enrollments.course_id = courses.id
         GROUP BY courses.id ORDER BY courses.title`
      )
      .all(),
    db.prepare('SELECT COUNT(*) AS count FROM quiz_attempts').get(),
    db.prepare('SELECT COUNT(*) AS count FROM submissions').get(),
    db.prepare('SELECT COUNT(*) AS count FROM submissions WHERE grade IS NULL').get(),
  ]);
  const reportRows = [
    ['Report', 'Field', 'Value', 'Details'],
    ['Platform summary', 'Generated at', new Date().toISOString(), 'UTC'],
    ...Object.entries({
      users: summaryValues[0].count,
      active_users: summaryValues[1].count,
      students: summaryValues[2].count,
      instructors: summaryValues[3].count,
      courses: summaryValues[4].count,
      published_courses: summaryValues[5].count,
      pending_courses: summaryValues[6].count,
      enrollments: summaryValues[7].count,
      certificates_issued: summaryValues[8].count,
    }).map(([field, value]) => ['Platform summary', field, value, '']),
    ['Course performance', 'Course', 'Enrollments', 'Completed students; average quiz score (%)'],
    ...courseRows.map((row) => ['Course performance', row.title, row.enrollments, `${row.completed_students} completed; ${row.average_quiz_score ?? 'N/A'} average quiz score`]),
    ['Assessment activity', 'Metric', 'Value', ''],
    ['Assessment activity', 'Quiz attempts', quizAttempts.count, ''],
    ['Assessment activity', 'Assignment submissions', assignmentSubmissions.count, ''],
    ['Assessment activity', 'Ungraded submissions', ungradedSubmissions.count, ''],
  ];
  const csv = reportRows
    .map((row) => row.map((value) => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    }).join(','))
    .join('\r\n');

  res.type('text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="eduverse-report-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
});

router.get('/users', async (req, res) => {
  const roleFilter = req.query.role || '';
  let sql = 'SELECT id, name, email, role, status, created_at FROM users';
  const params = [];
  if (['student', 'instructor', 'admin'].includes(roleFilter)) {
    sql += ' WHERE role = ?';
    params.push(roleFilter);
  }
  sql += ' ORDER BY created_at DESC';
  const users = await db.prepare(sql).all(...params);
  res.render('admin/users', { title: 'Manage Users', users, roleFilter });
});

router.post('/users/:id/suspend', async (req, res) => {
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).render('error', { title: 'Not found', message: 'User not found.' });
  if (target.id === req.session.user.id) {
    return res.status(400).render('error', { title: 'Not allowed', message: 'You cannot suspend your own account.' });
  }
  const newStatus = target.status === 'active' ? 'suspended' : 'active';
  await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, target.id);
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', async (req, res) => {
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).render('error', { title: 'Not found', message: 'User not found.' });
  if (target.id === req.session.user.id) {
    return res.status(400).render('error', { title: 'Not allowed', message: 'You cannot delete your own account.' });
  }
  await db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  res.redirect('/admin/users');
});

router.get('/courses', async (req, res) => {
  const statusFilter = req.query.status || '';
  let sql = `SELECT courses.*, users.name AS instructor_name,
                    (SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = courses.id) AS enrolled_count
             FROM courses JOIN users ON users.id = courses.instructor_id`;
  const params = [];
  if (['pending', 'published', 'rejected'].includes(statusFilter)) {
    sql += ' WHERE courses.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY courses.created_at DESC';
  const courses = await db.prepare(sql).all(...params);
  res.render('admin/courses', { title: 'Manage Courses', courses, statusFilter });
});

router.post('/courses/:id/approve', async (req, res) => {
  await db.prepare("UPDATE courses SET status = 'published' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/courses');
});

router.post('/courses/:id/reject', async (req, res) => {
  await db.prepare("UPDATE courses SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/courses');
});

router.post('/courses/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.redirect('/admin/courses');
});

module.exports = router;
