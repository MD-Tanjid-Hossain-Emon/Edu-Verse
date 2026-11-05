// db/seed.js
// Populates EduVerse with a demo administrator, instructor, student,
// and sample published courses so the app is explorable
// immediately after `npm run seed`.

const bcrypt = require('bcryptjs');
const db = require('./database');
const { listCcnaVideos } = require('../utils/ccna-videos');
const { insertSampleQuestions } = require('../utils/lesson-quiz-samples');

let instructorId;
let studentId;

async function upsertUser({ name, email, password, role }) {
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(password, 10);
  const colorByRole = { admin: '#F5A623', instructor: '#3D5AFE', student: '#00BFA6' };
  const info = await db
    .prepare('INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?,?,?,?,?)')
    .run(name, email, hash, role, colorByRole[role] || '#3D5AFE');
  return info.lastInsertRowid;
}

async function seedCourse({ title, description, category, level, color, lessons, quiz, assignment }) {
  const existing = await db.prepare('SELECT id FROM courses WHERE title = ?').get(title);
  if (existing) return existing.id;

  const courseInfo = await db
    .prepare(
      `INSERT INTO courses (title, description, category, level, cover_color, instructor_id, status)
       VALUES (?,?,?,?,?,?, 'published')`
    )
    .run(title, description, category, level, color, instructorId);
  const courseId = courseInfo.lastInsertRowid;

  for (const [idx, l] of lessons.entries()) {
    const lesson = await db.prepare(
      `INSERT INTO lessons (course_id, title, video_url, content, position) VALUES (?,?,?,?,?)`
    ).run(courseId, l.title, l.video_url, l.content, idx);
    const quiz = await db.prepare('INSERT INTO quizzes (course_id, lesson_id, title) VALUES (?,?,?)')
      .run(courseId, lesson.lastInsertRowid, `Quiz for ${l.title}`);
    await insertSampleQuestions(db, quiz.lastInsertRowid, l.title);
  }

  if (quiz) {
    const quizInfo = await db.prepare(`INSERT INTO quizzes (course_id, title) VALUES (?,?)`).run(courseId, quiz.title);
    const quizId = quizInfo.lastInsertRowid;
    for (const q of quiz.questions) {
      await db.prepare(
        `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
         VALUES (?,?,?,?,?,?,?)`
      ).run(quizId, q.question, q.a, q.b, q.c, q.d, q.correct);
    }
  }

  if (assignment) {
    await db.prepare(
      `INSERT INTO assignments (course_id, title, instructions, due_date) VALUES (?,?,?,?)`
    ).run(courseId, assignment.title, assignment.instructions, assignment.due_date);
  }

  return courseId;
}

async function main() {
await db.ready;
await upsertUser({ name: 'Amara Reyes', email: 'admin@eduverse.dev', password: 'Admin@123', role: 'admin' });
instructorId = await upsertUser({ name: 'Dr. Farid Chowdhury', email: 'instructor@eduverse.dev', password: 'Teach@123', role: 'instructor' });
studentId = await upsertUser({ name: 'Alex Morgan', email: 'student@eduverse.dev', password: 'Learn@123', role: 'student' });

const webCourseId = await seedCourse({
  title: 'Foundations of Web Development',
  description:
    'A hands-on introduction to building websites with HTML, CSS, and JavaScript, covering layout, styling, and interactivity from first principles.',
  category: 'Web Development',
  level: 'Beginner',
  color: '#3D5AFE',
  lessons: [
    { title: 'Structuring Pages with HTML', video_url: 'https://www.youtube.com/embed/UB1O30fR-EE', content: 'Learn semantic HTML elements and document structure.' },
    { title: 'Styling with CSS', video_url: 'https://www.youtube.com/embed/1PnVor36_40', content: 'Selectors, the box model, and responsive layout basics.' },
    { title: 'Adding Interactivity with JavaScript', video_url: 'https://www.youtube.com/embed/W6NZfCO5SIk', content: 'Variables, events, and DOM manipulation.' },
  ],
  quiz: {
    title: 'Web Development Basics Quiz',
    questions: [
      { question: 'Which tag defines the largest heading in HTML?', a: '<h6>', b: '<h1>', c: '<head>', d: '<heading>', correct: 'b' },
      { question: 'Which CSS property controls text size?', a: 'font-size', b: 'text-style', c: 'font-weight', d: 'text-size', correct: 'a' },
      { question: 'Which keyword declares a block-scoped variable in JavaScript?', a: 'var', b: 'define', c: 'let', d: 'static', correct: 'c' },
    ],
  },
  assignment: {
    title: 'Build a Personal Profile Page',
    instructions: 'Create a single HTML/CSS page introducing yourself. Upload a .zip or .html file.',
    due_date: null,
  },
});

await seedCourse({
  title: 'Introduction to Data Science',
  description:
    'Explore the data science workflow: collecting data, exploring it with statistics, and communicating findings clearly.',
  category: 'Data Science',
  level: 'Intermediate',
  color: '#00BFA6',
  lessons: [
    { title: 'What is Data Science?', video_url: 'https://www.youtube.com/embed/X3paOmcrTjQ', content: 'The data science workflow and common roles.' },
    { title: 'Working with Data using Python', video_url: 'https://www.youtube.com/embed/r-uOLxNrNk8', content: 'Intro to pandas for loading and cleaning data.' },
  ],
  quiz: {
    title: 'Data Science Fundamentals Quiz',
    questions: [
      { question: 'Which Python library is widely used for data manipulation?', a: 'pandas', b: 'flask', c: 'express', d: 'bcrypt', correct: 'a' },
      { question: 'What does "EDA" stand for in data science?', a: 'Extended Data Array', b: 'Exploratory Data Analysis', c: 'External Data Access', d: 'Encrypted Data Algorithm', correct: 'b' },
    ],
  },
  assignment: null,
});

await seedCourse({
  title: 'CCNA v1.1 200-301 | Complete Course 2026',
  description:
    'Study CCNA 200-301 v1.1 with the complete collection of video lessons.',
  category: 'Networking',
  level: 'Beginner',
  color: '#F5A623',
  lessons: [],
  quiz: null,
  assignment: null,
});

const ccnaCourseId = (await db
  .prepare('SELECT id FROM courses WHERE title = ?')
  .get('CCNA v1.1 200-301 | Complete Course 2026')).id;
const ccnaVideos = listCcnaVideos();
function syncCcnaLessonsSqlite(videos) {
  const existingLessons = db
    .prepare('SELECT id, video_url FROM lessons WHERE course_id = ? ORDER BY position ASC')
    .all(ccnaCourseId);
  const existingByUrl = new Map(
    existingLessons.filter((lesson) => lesson.video_url.startsWith('local:')).map((lesson) => [lesson.video_url, lesson])
  );
  let legacyLesson = existingLessons.find((lesson) => !lesson.video_url.startsWith('local:'));
  const retainedIds = new Set();

  videos.forEach((video, position) => {
    const videoUrl = `local:${video.relativePath}`;
    const existing = existingByUrl.get(videoUrl);
    if (existing) {
      db.prepare('UPDATE lessons SET title = ?, content = ?, position = ? WHERE id = ?').run(
        video.title,
        'CCNA course video lesson.',
        position,
        existing.id
      );
      retainedIds.add(existing.id);
    } else if (position === 0 && legacyLesson) {
      db.prepare('UPDATE lessons SET title = ?, video_url = ?, content = ?, position = ? WHERE id = ?').run(
        video.title,
        videoUrl,
        'CCNA course video lesson.',
        position,
        legacyLesson.id
      );
      retainedIds.add(legacyLesson.id);
      legacyLesson = null;
    } else {
      const result = db
        .prepare('INSERT INTO lessons (course_id, title, video_url, content, position) VALUES (?,?,?,?,?)')
        .run(ccnaCourseId, video.title, videoUrl, 'CCNA course video lesson.', position);
      retainedIds.add(result.lastInsertRowid);
    }
  });

  existingLessons.forEach((lesson) => {
    if (!retainedIds.has(lesson.id)) {
      db.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
    }
  });
}

async function syncCcnaLessonsMysql(videos) {
  await db.transaction(async (tx) => {
    const existingLessons = await tx
      .prepare('SELECT id, video_url FROM lessons WHERE course_id = ? ORDER BY position ASC')
      .all(ccnaCourseId);
    const existingByUrl = new Map(
      existingLessons.filter((lesson) => lesson.video_url.startsWith('local:')).map((lesson) => [lesson.video_url, lesson])
    );
    let legacyLesson = existingLessons.find((lesson) => !lesson.video_url.startsWith('local:'));
    const retainedIds = new Set();

    for (const [position, video] of videos.entries()) {
      const videoUrl = `local:${video.relativePath}`;
      const existing = existingByUrl.get(videoUrl);
      if (existing) {
        await tx.prepare('UPDATE lessons SET title = ?, content = ?, position = ? WHERE id = ?').run(
          video.title, 'CCNA course video lesson.', position, existing.id
        );
        retainedIds.add(existing.id);
      } else if (position === 0 && legacyLesson) {
        await tx.prepare('UPDATE lessons SET title = ?, video_url = ?, content = ?, position = ? WHERE id = ?').run(
          video.title, videoUrl, 'CCNA course video lesson.', position, legacyLesson.id
        );
        retainedIds.add(legacyLesson.id);
        legacyLesson = null;
      } else {
        const result = await tx.prepare(
          'INSERT INTO lessons (course_id, title, video_url, content, position) VALUES (?,?,?,?,?)'
        ).run(ccnaCourseId, video.title, videoUrl, 'CCNA course video lesson.', position);
        retainedIds.add(result.lastInsertRowid);
      }
    }

    for (const lesson of existingLessons) {
      if (!retainedIds.has(lesson.id)) await tx.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
    }
  })();
}

if (db.dialect === 'mysql') {
  await syncCcnaLessonsMysql(ccnaVideos);
} else {
  db.transaction(syncCcnaLessonsSqlite)(ccnaVideos);
  db.prepare(
    `INSERT INTO quizzes (course_id, lesson_id, title)
     SELECT lessons.course_id, lessons.id, 'Quiz for ' || lessons.title
     FROM lessons
     LEFT JOIN quizzes ON quizzes.lesson_id = lessons.id
     WHERE quizzes.id IS NULL`
  ).run();
}

const lessonQuizzes = await db
  .prepare(
    `SELECT quizzes.id AS quiz_id, lessons.title
     FROM quizzes JOIN lessons ON lessons.id = quizzes.lesson_id`
  )
  .all();
if (db.dialect === 'mysql') {
  await db.transaction(async (tx) => {
    for (const quiz of lessonQuizzes) await insertSampleQuestions(tx, quiz.quiz_id, quiz.title);
  })();
} else {
  db.transaction(() => {
    lessonQuizzes.forEach((quiz) => insertSampleQuestions(db, quiz.quiz_id, quiz.title));
  })();
}

// Enroll the demo student in the web development course with some progress.
const enrollExisting = await db
  .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
  .get(studentId, webCourseId);
if (!enrollExisting) {
  await db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(studentId, webCourseId);
  const firstLesson = await db.prepare('SELECT id FROM lessons WHERE course_id = ? ORDER BY position ASC LIMIT 1').get(webCourseId);
  if (firstLesson) {
    await db.prepare('INSERT OR IGNORE INTO lesson_progress (student_id, lesson_id) VALUES (?,?)').run(studentId, firstLesson.id);
  }
}

console.log('Seed complete.');
console.log('----------------------------------------------------');
console.log('Demo accounts (all on http://localhost:3000/login):');
console.log('  Admin:      admin@eduverse.dev      / Admin@123');
console.log('  Instructor: instructor@eduverse.dev  / Teach@123');
console.log('  Student:    student@eduverse.dev     / Learn@123');
console.log('----------------------------------------------------');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
