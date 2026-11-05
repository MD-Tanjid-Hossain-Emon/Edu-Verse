const { createSampleQuestions } = require('./sample-lesson-questions');

function insertSampleQuestions(db, quizId, lessonTitle) {
  if (db.dialect === 'mysql') {
    return insertSampleQuestionsMysql(db, quizId, lessonTitle);
  }

  const sampleCount = db
    .prepare("SELECT COUNT(*) AS count FROM quiz_questions WHERE quiz_id = ? AND source = 'sample'")
    .get(quizId).count;
  if (sampleCount >= 20) {
    const attempts = db.prepare('SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = ?').get(quizId).count;
    if (attempts === 0 && sampleCount === 20) {
      const sampleIds = db
        .prepare("SELECT id FROM quiz_questions WHERE quiz_id = ? AND source = 'sample' ORDER BY id")
        .all(quizId);
      const updateQuestion = db.prepare(
        `UPDATE quiz_questions
         SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
         WHERE id = ?`
      );
      createSampleQuestions(lessonTitle).forEach((question, index) => {
        updateQuestion.run(question.question, ...question.options, question.correct_option, sampleIds[index].id);
      });
    }
    return 0;
  }
  if (sampleCount > 0) {
    throw new Error(`Quiz ${quizId} has a partial sample bank (${sampleCount}/20). Refusing to duplicate questions.`);
  }

  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions
     (quiz_id, question, option_a, option_b, option_c, option_d, correct_option, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'sample')`
  );
  const questions = createSampleQuestions(lessonTitle);
  for (const question of questions) {
    insertQuestion.run(quizId, question.question, ...question.options, question.correct_option);
  }
  return questions.length;
}

async function insertSampleQuestionsMysql(db, quizId, lessonTitle) {
  const sampleCount = (await db
    .prepare("SELECT COUNT(*) AS count FROM quiz_questions WHERE quiz_id = ? AND source = 'sample'")
    .get(quizId)).count;
  if (sampleCount >= 20) {
    const attempts = (await db.prepare('SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = ?').get(quizId)).count;
    if (attempts === 0 && sampleCount === 20) {
      const sampleIds = await db
        .prepare("SELECT id FROM quiz_questions WHERE quiz_id = ? AND source = 'sample' ORDER BY id")
        .all(quizId);
      const updateQuestion = db.prepare(
        `UPDATE quiz_questions
         SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
         WHERE id = ?`
      );
      for (const [index, question] of createSampleQuestions(lessonTitle).entries()) {
        await updateQuestion.run(question.question, ...question.options, question.correct_option, sampleIds[index].id);
      }
    }
    return 0;
  }
  if (sampleCount > 0) {
    throw new Error(`Quiz ${quizId} has a partial sample bank (${sampleCount}/20). Refusing to duplicate questions.`);
  }

  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions
     (quiz_id, question, option_a, option_b, option_c, option_d, correct_option, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'sample')`
  );
  const questions = createSampleQuestions(lessonTitle);
  for (const question of questions) {
    await insertQuestion.run(quizId, question.question, ...question.options, question.correct_option);
  }
  return questions.length;
}

module.exports = { insertSampleQuestions };
