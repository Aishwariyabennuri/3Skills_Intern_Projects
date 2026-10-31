const express = require('express');
const router = express.Router();
const { db, quizzes, questions } = require('../db/database');

function serializeQuiz(quiz) {
  const qs = questions.getQuestionsForQuiz.all(quiz.id).map((q) => ({
    ...q,
    options: JSON.parse(q.options),
  }));
  return { ...quiz, questions: qs };
}

// GET /api/quizzes  -> list all quizzes (summary only)
router.get('/', (req, res) => {
  const list = quizzes.listQuizzes.all().map((quiz) => {
    const qs = questions.getQuestionsForQuiz.all(quiz.id);
    return { ...quiz, questionCount: qs.length };
  });
  res.json(list);
});

// GET /api/quizzes/:id -> full quiz with questions
router.get('/:id', (req, res) => {
  const quiz = quizzes.getQuiz.get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(serializeQuiz(quiz));
});

// POST /api/quizzes -> create a quiz with its questions
router.post('/', (req, res) => {
  const { title, description, questions: qList } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'A quiz title is required.' });
  }
  if (!Array.isArray(qList) || qList.length === 0) {
    return res.status(400).json({ error: 'Add at least one question.' });
  }

  for (const [i, q] of qList.entries()) {
    if (!q.question_text || !q.question_text.trim()) {
      return res.status(400).json({ error: `Question ${i + 1} is missing text.` });
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return res.status(400).json({ error: `Question ${i + 1} needs at least 2 options.` });
    }
    if (
      typeof q.correct_index !== 'number' ||
      q.correct_index < 0 ||
      q.correct_index >= q.options.length
    ) {
      return res.status(400).json({ error: `Question ${i + 1} needs a valid correct answer.` });
    }
  }

  const insertQuiz = quizzes.createQuiz;
  const insertQuestion = questions.createQuestion;

  db.exec('BEGIN');
  try {
    const result = insertQuiz.run(title.trim(), (description || '').trim());
    const quizId = result.lastInsertRowid;
    qList.forEach((q, idx) => {
      insertQuestion.run({
        quiz_id: quizId,
        question_text: q.question_text.trim(),
        options: JSON.stringify(q.options.map((o) => String(o).trim())),
        correct_index: q.correct_index,
        time_limit: q.time_limit && q.time_limit > 0 ? q.time_limit : 20,
        points: q.points && q.points > 0 ? q.points : 1000,
        order_index: idx,
      });
    });
    db.exec('COMMIT');

    const quiz = quizzes.getQuiz.get(quizId);
    res.status(201).json(serializeQuiz(quiz));
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Could not save the quiz. Please try again.' });
  }
});

// DELETE /api/quizzes/:id
router.delete('/:id', (req, res) => {
  const quiz = quizzes.getQuiz.get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  quizzes.deleteQuiz.run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
