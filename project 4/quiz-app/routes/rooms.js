const express = require('express');
const router = express.Router();
const { rooms, quizzes, teams, players, questions } = require('../db/database');
const { generateRoomCode } = require('../utils/codeGenerator');

// POST /api/rooms  { quiz_id }  -> create a fresh room for hosting a quiz
router.post('/', (req, res) => {
  const { quiz_id } = req.body;
  const quiz = quizzes.getQuiz.get(quiz_id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const qCount = questions.getQuestionsForQuiz.all(quiz_id).length;
  if (qCount === 0) {
    return res.status(400).json({ error: 'This quiz has no questions yet.' });
  }

  let code;
  let attempts = 0;
  do {
    code = generateRoomCode();
    attempts += 1;
  } while (rooms.getRoomByCode.get(code) && attempts < 10);

  const result = rooms.createRoom.run(code, quiz_id);
  const room = rooms.getRoomById.get(result.lastInsertRowid);
  res.status(201).json({ ...room, quizTitle: quiz.title, questionCount: qCount });
});

// GET /api/rooms/:code -> basic room info, used by the join screen to validate a code
router.get('/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.getRoomByCode.get(code);
  if (!room) return res.status(404).json({ error: 'No game found with that room code.' });

  const quiz = quizzes.getQuiz.get(room.quiz_id);
  const qCount = questions.getQuestionsForQuiz.all(room.quiz_id).length;
  const teamList = teams.getTeamsForRoom.all(room.id);
  const playerList = players.getPlayersForRoom.all(room.id);

  res.json({
    code: room.code,
    status: room.status,
    quizTitle: quiz ? quiz.title : 'Quiz',
    questionCount: qCount,
    teamCount: teamList.length,
    playerCount: playerList.length,
  });
});

module.exports = router;
