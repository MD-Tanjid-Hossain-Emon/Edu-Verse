// routes/public.js
// Landing page + public course catalog/detail. Anyone (including guests)
// can browse published courses; enrolling requires a student login.

const db = require('../db/database');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();

router.get('/', async (req, res) => {
  const featured = await db
    .prepare(
      `SELECT courses.*, users.name AS instructor_name,
              (SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = courses.id) AS enrolled_count,
              (SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id) AS lesson_count
       FROM courses
       JOIN users ON users.id = courses.instructor_id
       WHERE courses.status = 'published'
       ORDER BY courses.created_at DESC
       LIMIT 6`
    )
    .all();

  const [courseCount, studentCount, instructorCount] = await Promise.all([
    db.prepare("SELECT COUNT(*) c FROM courses WHERE status='published'").get(),
    db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get(),
    db.prepare("SELECT COUNT(*) c FROM users WHERE role='instructor'").get(),
  ]);
  const stats = { courses: courseCount.c, students: studentCount.c, instructors: instructorCount.c };

  res.render('home', { title: 'EduVerse — A universe of learning opportunities', featured, stats });
});

router.get('/courses', async (req, res) => {
  const q = (req.query.q || '').trim();
  const category = (req.query.category || '').trim();

  let sql = `
    SELECT courses.*, users.name AS instructor_name,
           (SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = courses.id) AS enrolled_count,
           (SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id) AS lesson_count
    FROM courses
    JOIN users ON users.id = courses.instructor_id
    WHERE courses.status = 'published'
  `;
  const params = [];
  if (q) {
    sql += ' AND (courses.title LIKE ? OR courses.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ' AND courses.category = ?';
    params.push(category);
  }
  sql += ' ORDER BY courses.created_at DESC';

  const [courses, categoryRows] = await Promise.all([
    db.prepare(sql).all(...params),
    db.prepare("SELECT DISTINCT category FROM courses WHERE status='published' ORDER BY category").all(),
  ]);
  const categories = categoryRows.map((r) => r.category);

  res.render('courses/catalog', { title: 'Course Catalog', courses, categories, q, category });
});

router.get('/courses/:id', async (req, res) => {
  const course = await db
    .prepare(
      `SELECT courses.*, users.name AS instructor_name
       FROM courses JOIN users ON users.id = courses.instructor_id
       WHERE courses.id = ? AND courses.status = 'published'`
    )
    .get(req.params.id);

  if (!course) {
    return res.status(404).render('error', { title: 'Course not found', message: "That course doesn't exist or isn't published yet." });
  }

  const lessons = await db.prepare('SELECT id, title FROM lessons WHERE course_id = ? ORDER BY position ASC').all(course.id);
  let isEnrolled = false;
  if (req.session.user && req.session.user.role === 'student') {
    isEnrolled = !!await db.prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?').get(req.session.user.id, course.id);
  }

  res.render('courses/detail', { title: course.title, course, lessons, isEnrolled });
});

module.exports = router;
