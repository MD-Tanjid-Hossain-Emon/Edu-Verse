const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eduverse-test-'));
const videoDirectory = path.join(temporaryDirectory, 'videos');
fs.mkdirSync(videoDirectory);
fs.writeFileSync(path.join(videoDirectory, 'lesson.mp4'), Buffer.from('video-content'));
process.env.EDUVERSE_DB_PATH = path.join(temporaryDirectory, 'eduverse.db');
process.env.EDUVERSE_DATA_DIR = path.join(temporaryDirectory, 'data');
process.env.EDUVERSE_UPLOADS_DIR = path.join(temporaryDirectory, 'uploads');
process.env.CCNA_VIDEO_DIR = videoDirectory;
process.env.NODE_ENV = 'test';

const db = require('../db/database');
const app = require('../server');

const accounts = {
  student: { name: 'Test Student', email: 'student@example.test', password: 'StudentPass123!', role: 'student' },
  instructor: { name: 'Test Instructor', email: 'instructor@example.test', password: 'InstructorPass123!', role: 'instructor' },
  admin: { name: 'Test Admin', email: 'admin@example.test', password: 'AdminPass123!', role: 'admin' },
};

let server;
let baseUrl;
let courseId;
let lessonId;
let quizId;
let questionId;
let lessonQuizId;

before(async () => {
  for (const account of Object.values(accounts)) {
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)').run(
      account.name,
      account.email,
      bcrypt.hashSync(account.password, 4),
      account.role
    );
  }
  const studentId = db.prepare('SELECT id FROM users WHERE email = ?').get(accounts.student.email).id;
  const instructorId = db.prepare('SELECT id FROM users WHERE email = ?').get(accounts.instructor.email).id;
  courseId = db
    .prepare("INSERT INTO courses (title, description, category, level, instructor_id, status) VALUES (?,?,?,?,?,'published')")
    .run('Test Course', 'Course for integration tests.', 'Testing', 'Beginner', instructorId).lastInsertRowid;
  lessonId = db
    .prepare('INSERT INTO lessons (course_id, title, video_url, position) VALUES (?,?,?,?)')
    .run(courseId, 'Test video', 'local:lesson.mp4', 0).lastInsertRowid;
  quizId = db.prepare('INSERT INTO quizzes (course_id, title) VALUES (?,?)').run(courseId, 'Test quiz').lastInsertRowid;
  questionId = db
    .prepare(
      `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(quizId, 'Two plus two?', 'Four', 'Five', 'Six', 'Seven', 'a').lastInsertRowid;
  lessonQuizId = db.prepare('INSERT INTO quizzes (course_id, lesson_id, title) VALUES (?,?,?)')
    .run(courseId, lessonId, 'Test video quiz').lastInsertRowid;
  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
     VALUES (?,?,?,?,?,?,?)`
  );
  for (let index = 1; index <= 20; index += 1) {
    insertQuestion.run(lessonQuizId, `Lesson question ${index}`, 'Correct', 'Wrong one', 'Wrong two', 'Wrong three', 'a');
  }
  db.prepare(
    "INSERT INTO courses (title, description, category, level, instructor_id, status) VALUES ('=2+2', '', 'Test', 'Beginner', ?, 'published')"
  ).run(instructorId);
  db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(studentId, courseId);
  const expiredAssignmentDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  db.prepare('INSERT INTO assignments (course_id, title, due_date) VALUES (?,?,?)')
    .run(courseId, 'Expired test assignment', expiredAssignmentDate);

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function login(account) {
  const loginPage = await fetch(`${baseUrl}/login`);
  const cookie = loginPage.headers.get('set-cookie').split(';')[0];
  const html = await loginPage.text();
  const token = html.match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(token, 'login page must contain a CSRF token');

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: account.email, password: account.password, _csrf: token }),
  });
  assert.equal(response.status, 302);
  return response.headers.get('set-cookie').split(';')[0];
}

test('health endpoint and browser security headers are available', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
});

test('login rejects invalid CSRF tokens before authentication', async () => {
  const response = await fetch(`${baseUrl}/login`);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const rejected = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: accounts.student.email, password: accounts.student.password, _csrf: 'invalid' }),
  });
  assert.equal(rejected.status, 403);
});

test('students can view enrolled lessons and stream local video with byte ranges', async () => {
  const cookie = await login(accounts.student);
  const page = await fetch(`${baseUrl}/student/courses/${courseId}`, { headers: { cookie } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<video controls/);
  assert.match(html, /quiz unlocks when the video finishes/i);
  assert.doesNotMatch(html, /Mark complete/);

  const video = await fetch(`${baseUrl}/student/lessons/${lessonId}/video`, {
    headers: { cookie, range: 'bytes=0-4' },
  });
  assert.equal(video.status, 206);
  assert.equal(video.headers.get('content-type'), 'video/mp4');
  assert.equal(await video.text(), 'video');
});

test('lesson quizzes unlock after video completion, allow retakes, and complete at 40 percent', async () => {
  const cookie = await login(accounts.student);
  const coursePage = await fetch(`${baseUrl}/student/courses/${courseId}`, { headers: { cookie } });
  const csrfToken = (await coursePage.text()).match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(csrfToken);

  const lockedQuiz = await fetch(`${baseUrl}/student/quizzes/${lessonQuizId}`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(lockedQuiz.status, 302);

  const oldCompletion = await fetch(`${baseUrl}/student/lessons/${lessonId}/complete`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfToken }),
    redirect: 'manual',
  });
  assert.equal(oldCompletion.status, 404);
  assert.equal(
    db.prepare('SELECT 1 FROM lesson_progress WHERE student_id = (SELECT id FROM users WHERE email = ?) AND lesson_id = ?')
      .get(accounts.student.email, lessonId),
    undefined
  );

  const watched = await fetch(`${baseUrl}/student/lessons/${lessonId}/watched`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfToken }),
    redirect: 'manual',
  });
  assert.equal(watched.status, 302);

  const quizPage = await fetch(`${baseUrl}/student/quizzes/${lessonQuizId}`, { headers: { cookie } });
  assert.equal(quizPage.status, 200);
  const quizHtml = await quizPage.text();
  assert.match(quizHtml, /all 20 questions/i);

  const questionIds = db.prepare('SELECT id FROM quiz_questions WHERE quiz_id = ? ORDER BY id').all(lessonQuizId);
  async function submit(correctAnswers) {
    const body = new URLSearchParams({ _csrf: csrfToken });
    questionIds.forEach((question, index) => {
      body.set(`q_${question.id}`, index < correctAnswers ? 'a' : 'b');
    });
    return fetch(`${baseUrl}/student/quizzes/${lessonQuizId}/submit`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  assert.equal((await submit(7)).status, 302);
  assert.equal(
    db.prepare('SELECT 1 FROM lesson_progress WHERE student_id = (SELECT id FROM users WHERE email = ?) AND lesson_id = ?')
      .get(accounts.student.email, lessonId),
    undefined
  );
  const retryPage = await fetch(`${baseUrl}/student/courses/${courseId}`, { headers: { cookie } });
  assert.match(await retryPage.text(), /Retake quiz/);

  assert.equal((await submit(8)).status, 302);
  assert.ok(
    db.prepare('SELECT 1 FROM lesson_progress WHERE student_id = (SELECT id FROM users WHERE email = ?) AND lesson_id = ?')
      .get(accounts.student.email, lessonId)
  );
  const passedPage = await fetch(`${baseUrl}/student/courses/${courseId}`, { headers: { cookie } });
  const passedHtml = await passedPage.text();
  assert.match(passedHtml, /Passed quiz/);
  assert.doesNotMatch(passedHtml, /Retake quiz/);
});

test('account settings update profile details and admin CSV reports are role protected', async () => {
  const studentCookie = await login(accounts.student);
  const accountPage = await fetch(`${baseUrl}/account`, { headers: { cookie: studentCookie } });
  const accountHtml = await accountPage.text();
  const csrfToken = accountHtml.match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(csrfToken);

  const updated = await fetch(`${baseUrl}/account`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: studentCookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      _csrf: csrfToken,
      name: 'Updated Student',
      email: accounts.student.email,
      current_password: '',
      new_password: '',
      confirm_password: '',
    }),
  });
  assert.equal(updated.status, 200);
  assert.match(await updated.text(), /Your account details have been updated/);

  const denied = await fetch(`${baseUrl}/admin/reports.csv`, { headers: { cookie: studentCookie } });
  assert.equal(denied.status, 403);

  const adminCookie = await login(accounts.admin);
  const dashboard = await fetch(`${baseUrl}/admin/dashboard`, { headers: { cookie: adminCookie } });
  assert.equal(dashboard.status, 200);
  const report = await fetch(`${baseUrl}/admin/reports.csv`, { headers: { cookie: adminCookie } });
  assert.equal(report.status, 200);
  assert.match(report.headers.get('content-type'), /text\/csv/);
  const csv = await report.text();
  assert.match(csv, /Course performance/);
  assert.match(csv, /'=2\+2/);
});

test('instructors can upload MP4 lessons and review course performance metrics', async () => {
  const instructorCookie = await login(accounts.instructor);
  const dashboard = await fetch(`${baseUrl}/instructor/courses/${courseId}`, { headers: { cookie: instructorCookie } });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Course completion rate/);

  const form = new FormData();
  form.set('title', 'Uploaded lesson');
  form.set('content', 'Test video upload.');
  form.set('video', new Blob(['not an mp4'], { type: 'video/mp4' }), 'forged.mp4');
  const rejectedUpload = await fetch(`${baseUrl}/instructor/courses/${courseId}/lessons`, {
    method: 'POST',
    headers: { cookie: instructorCookie, origin: baseUrl },
    body: form,
    redirect: 'manual',
  });
  assert.equal(rejectedUpload.status, 400);
  assert.match(await rejectedUpload.text(), /contents do not match/i);
  assert.equal(fs.readdirSync(path.join(process.env.EDUVERSE_UPLOADS_DIR, 'lessons')).length, 0);

  const validVideo = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from('ftypisom')]);
  form.set('video', new Blob([validVideo], { type: 'video/mp4' }), 'uploaded.mp4');
  const uploadResponse = await fetch(`${baseUrl}/instructor/courses/${courseId}/lessons`, {
    method: 'POST',
    headers: { cookie: instructorCookie, origin: baseUrl },
    body: form,
    redirect: 'manual',
  });
  assert.equal(uploadResponse.status, 302);

  const uploadedLesson = db.prepare('SELECT id, video_url FROM lessons WHERE title = ?').get('Uploaded lesson');
  assert.match(uploadedLesson.video_url, /^upload:[a-f0-9]+\.mp4$/);
  assert.equal(
    db.prepare(
      `SELECT COUNT(*) AS count FROM quiz_questions
       JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
       WHERE quizzes.lesson_id = ? AND quiz_questions.source = 'sample'`
    ).get(uploadedLesson.id).count,
    20
  );
  const studentCookie = await login(accounts.student);
  const video = await fetch(`${baseUrl}/student/lessons/${uploadedLesson.id}/video`, {
    headers: { cookie: studentCookie, range: 'bytes=4-7' },
  });
  assert.equal(video.status, 206);
  assert.equal(await video.text(), 'ftyp');
});

test('students cannot submit assignments after their deadline', async () => {
  const studentCookie = await login(accounts.student);
  const assignment = db.prepare("SELECT id FROM assignments WHERE title = 'Expired test assignment'").get();
  const form = new FormData();
  form.set('file', new Blob(['late submission'], { type: 'text/plain' }), 'late.txt');
  const response = await fetch(`${baseUrl}/student/assignments/${assignment.id}/submit`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin: baseUrl },
    body: form,
    redirect: 'manual',
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /no longer accepting submissions/);
});

test('quiz results are scored and displayed immediately', async () => {
  const cookie = await login(accounts.student);
  const quizPage = await fetch(`${baseUrl}/student/quizzes/${quizId}`, { headers: { cookie } });
  assert.equal(quizPage.status, 200);
  const token = (await quizPage.text()).match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(token);

  const result = await fetch(`${baseUrl}/student/quizzes/${quizId}/submit`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: token, [`q_${questionId}`]: 'a' }),
  });
  assert.equal(result.status, 302);
  assert.deepEqual(db.prepare('SELECT score, total FROM quiz_attempts WHERE quiz_id = ? ORDER BY id DESC LIMIT 1').get(quizId), {
    score: 1,
    total: 1,
  });
  const dashboard = await fetch(`${baseUrl}/student/dashboard`, { headers: { cookie } });
  assert.match(await dashboard.text(), /Latest quiz: 1\/1/);
});

test('finishing all lessons automatically issues a downloadable certificate', async () => {
  const studentId = db.prepare('SELECT id FROM users WHERE email = ?').get(accounts.student.email).id;
  const certificateCourseId = db
    .prepare("INSERT INTO courses (title, description, category, level, instructor_id, status) VALUES ('Certificate test', '', 'Testing', 'Beginner', (SELECT id FROM users WHERE email = ?), 'published')")
    .run(accounts.instructor.email).lastInsertRowid;
  db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(studentId, certificateCourseId);
  const lessonIds = [];
  for (let lessonIndex = 1; lessonIndex <= 2; lessonIndex += 1) {
    const id = db.prepare('INSERT INTO lessons (course_id, title, video_url, position) VALUES (?,?,?,?)')
      .run(certificateCourseId, `Certificate lesson ${lessonIndex}`, 'local:lesson.mp4', lessonIndex).lastInsertRowid;
    lessonIds.push(id);
    const quiz = db.prepare('INSERT INTO quizzes (course_id, lesson_id, title) VALUES (?,?,?)')
      .run(certificateCourseId, id, `Certificate quiz ${lessonIndex}`);
    for (let questionIndex = 1; questionIndex <= 20; questionIndex += 1) {
      db.prepare(
        `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
         VALUES (?,?,?,?,?,?,?)`
      ).run(quiz.lastInsertRowid, `Certificate question ${questionIndex}`, 'Correct', 'Wrong one', 'Wrong two', 'Wrong three', 'a');
    }
  }

  const cookie = await login(accounts.student);
  const page = await fetch(`${baseUrl}/student/courses/${certificateCourseId}`, { headers: { cookie } });
  const token = (await page.text()).match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(token);
  const questionIds = db.prepare(
    `SELECT quiz_questions.id FROM quiz_questions
     JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
     WHERE quizzes.lesson_id = ?`
  );
  for (const id of lessonIds) {
    const watched = await fetch(`${baseUrl}/student/lessons/${id}/watched`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf: token }),
    });
    assert.equal(watched.status, 302);
    const questions = questionIds.all(id);
    const quizIdForLesson = db.prepare('SELECT id FROM quizzes WHERE lesson_id = ?').get(id).id;
    const answers = new URLSearchParams({ _csrf: token });
    questions.forEach((question, index) => answers.set(`q_${question.id}`, index < 8 ? 'a' : 'b'));
    const passed = await fetch(`${baseUrl}/student/quizzes/${quizIdForLesson}/submit`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: answers,
    });
    assert.equal(passed.status, 302);
  }

  assert.equal(
    db.prepare('SELECT certificate_issued FROM enrollments WHERE student_id = (SELECT id FROM users WHERE email = ?) AND course_id = ?')
      .get(accounts.student.email, certificateCourseId).certificate_issued,
    1
  );
  const certificate = await fetch(`${baseUrl}/student/certificate/${certificateCourseId}`, { headers: { cookie } });
  assert.equal(certificate.status, 200);
  assert.match(certificate.headers.get('content-type'), /application\/pdf/);
});

test('assignment uploads validate file contents and reject HTML files', async () => {
  const studentCookie = await login(accounts.student);
  const assignmentId = db.prepare('INSERT INTO assignments (course_id, title) VALUES (?,?)')
    .run(courseId, 'Upload validation test').lastInsertRowid;

  async function submitFile(name, content, type) {
    const form = new FormData();
    form.set('file', new Blob([content], { type }), name);
    return fetch(`${baseUrl}/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { cookie: studentCookie, origin: baseUrl },
      body: form,
      redirect: 'manual',
    });
  }

  const forgedPdf = await submitFile('forged.pdf', 'not a PDF', 'application/pdf');
  assert.equal(forgedPdf.status, 400);
  assert.match(await forgedPdf.text(), /contents do not match/i);
  assert.equal(db.prepare('SELECT 1 FROM submissions WHERE assignment_id = ?').get(assignmentId), undefined);
  assert.equal(fs.readdirSync(path.join(process.env.EDUVERSE_UPLOADS_DIR, 'assignments')).length, 0);

  const htmlFile = await submitFile('page.html', '<script>alert(1)</script>', 'text/html');
  assert.equal(htmlFile.status, 400);

  const invalidText = await submitFile('binary.txt', Buffer.from([0xff]), 'text/plain');
  assert.equal(invalidText.status, 400);

  const validPdf = await submitFile('work.pdf', '%PDF-1.7\nsample document', 'application/pdf');
  assert.equal(validPdf.status, 302);
  assert.ok(db.prepare('SELECT 1 FROM submissions WHERE assignment_id = ?').get(assignmentId));
});

test('login throttles repeated invalid credentials by client address', async () => {
  const loginPage = await fetch(`${baseUrl}/login`);
  const cookie = loginPage.headers.get('set-cookie').split(';')[0];
  const token = (await loginPage.text()).match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(token);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'unknown@example.test', password: 'wrong-password', _csrf: token }),
    });
    assert.equal(response.status, 401);
  }

  const throttled = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'unknown@example.test', password: 'wrong-password', _csrf: token }),
  });
  assert.equal(throttled.status, 429);
  assert.ok(Number(throttled.headers.get('retry-after')) > 0);
});
