const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'quiz.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ---------- Quizzes ----------
const createQuiz = db.prepare(
  `INSERT INTO quizzes (title, description) VALUES (?, ?)`
);
const getQuiz = db.prepare(`SELECT * FROM quizzes WHERE id = ?`);
const listQuizzes = db.prepare(`SELECT * FROM quizzes ORDER BY created_at DESC`);
const deleteQuiz = db.prepare(`DELETE FROM quizzes WHERE id = ?`);

// ---------- Questions ----------
const createQuestion = db.prepare(
  `INSERT INTO questions (quiz_id, question_text, options, correct_index, time_limit, points, order_index)
   VALUES (@quiz_id, @question_text, @options, @correct_index, @time_limit, @points, @order_index)`
);
const getQuestionsForQuiz = db.prepare(
  `SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC`
);
const getQuestion = db.prepare(`SELECT * FROM questions WHERE id = ?`);

// ---------- Rooms ----------
const createRoom = db.prepare(
  `INSERT INTO rooms (code, quiz_id, status, current_question) VALUES (?, ?, 'lobby', -1)`
);
const getRoomByCode = db.prepare(`SELECT * FROM rooms WHERE code = ?`);
const getRoomById = db.prepare(`SELECT * FROM rooms WHERE id = ?`);
const updateRoomStatus = db.prepare(`UPDATE rooms SET status = ? WHERE id = ?`);
const updateRoomQuestion = db.prepare(
  `UPDATE rooms SET current_question = ?, status = ? WHERE id = ?`
);

// ---------- Teams ----------
const createTeam = db.prepare(
  `INSERT INTO teams (room_id, name, code, color) VALUES (?, ?, ?, ?)`
);
const getTeamByCode = db.prepare(
  `SELECT * FROM teams WHERE room_id = ? AND code = ?`
);
const getTeamsForRoom = db.prepare(
  `SELECT * FROM teams WHERE room_id = ? ORDER BY score DESC, id ASC`
);
const addTeamScore = db.prepare(
  `UPDATE teams SET score = score + ? WHERE id = ?`
);

// ---------- Players ----------
const createPlayer = db.prepare(
  `INSERT INTO players (room_id, team_id, name, socket_id) VALUES (?, ?, ?, ?)`
);
const getPlayer = db.prepare(`SELECT * FROM players WHERE id = ?`);
const getPlayersForRoom = db.prepare(
  `SELECT * FROM players WHERE room_id = ? ORDER BY score DESC, id ASC`
);
const getPlayersForTeam = db.prepare(
  `SELECT * FROM players WHERE team_id = ? ORDER BY score DESC, id ASC`
);
const updatePlayerSocket = db.prepare(
  `UPDATE players SET socket_id = ?, connected = 1 WHERE id = ?`
);
const setPlayerDisconnected = db.prepare(
  `UPDATE players SET connected = 0 WHERE socket_id = ?`
);
const getPlayerBySocket = db.prepare(
  `SELECT * FROM players WHERE socket_id = ?`
);
const addPlayerScore = db.prepare(
  `UPDATE players SET score = score + ? WHERE id = ?`
);

// ---------- Answers ----------
const createAnswer = db.prepare(
  `INSERT INTO answers (player_id, question_id, selected_index, is_correct, points_awarded, time_taken)
   VALUES (@player_id, @question_id, @selected_index, @is_correct, @points_awarded, @time_taken)`
);
const getAnswer = db.prepare(
  `SELECT * FROM answers WHERE player_id = ? AND question_id = ?`
);
const getAnswersForQuestion = db.prepare(
  `SELECT * FROM answers WHERE question_id = ?`
);

module.exports = {
  db,
  quizzes: { createQuiz, getQuiz, listQuizzes, deleteQuiz },
  questions: { createQuestion, getQuestionsForQuiz, getQuestion },
  rooms: { createRoom, getRoomByCode, getRoomById, updateRoomStatus, updateRoomQuestion },
  teams: { createTeam, getTeamByCode, getTeamsForRoom, addTeamScore },
  players: {
    createPlayer,
    getPlayer,
    getPlayersForRoom,
    getPlayersForTeam,
    updatePlayerSocket,
    setPlayerDisconnected,
    getPlayerBySocket,
    addPlayerScore,
  },
  answers: { createAnswer, getAnswer, getAnswersForQuestion },
};
