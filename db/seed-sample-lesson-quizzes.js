const db = require('./database');
const { insertSampleQuestions } = require('../utils/lesson-quiz-samples');

async function main() {
  await db.ready;
  const lessonQuizzes = await db
    .prepare(
      `SELECT quizzes.id AS quiz_id, lessons.title
       FROM quizzes
       JOIN lessons ON lessons.id = quizzes.lesson_id
       ORDER BY quizzes.course_id, lessons.position, lessons.id`
    )
    .all();

  let updatedQuizzes = 0;
  if (db.dialect === 'mysql') {
    await db.transaction(async (tx) => {
      for (const quiz of lessonQuizzes) {
        updatedQuizzes += Number((await insertSampleQuestions(tx, quiz.quiz_id, quiz.title)) > 0);
      }
    })();
  } else {
    db.transaction(() => {
      for (const quiz of lessonQuizzes) {
        updatedQuizzes += Number(insertSampleQuestions(db, quiz.quiz_id, quiz.title) > 0);
      }
    })();
  }

  const summary = await db.prepare(
    `SELECT COUNT(*) AS quizzes,
       SUM(CASE WHEN samples >= 20 THEN 1 ELSE 0 END) AS ready
     FROM (
       SELECT quizzes.id, COUNT(CASE WHEN quiz_questions.source = 'sample' THEN 1 END) AS samples
       FROM quizzes
       JOIN lessons ON lessons.id = quizzes.lesson_id
       LEFT JOIN quiz_questions ON quiz_questions.quiz_id = quizzes.id
       GROUP BY quizzes.id
     ) AS lesson_quiz_samples`
  ).get();
  console.log(`Added 20 topic-based sample questions to ${updatedQuizzes} lesson quizzes.`);
  console.log(`${summary.ready} of ${summary.quizzes} lesson quizzes now have at least 20 sample questions.`);
}

main()
  .catch((error) => {
    console.error('Sample quiz seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
