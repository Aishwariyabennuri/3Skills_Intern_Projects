-- QuizUp Live database schema

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,          -- JSON array of strings
  correct_index INTEGER NOT NULL, -- 0-based index into options
  time_limit INTEGER DEFAULT 20,  -- seconds
  points INTEGER DEFAULT 1000,    -- max points for a fast correct answer
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  quiz_id INTEGER NOT NULL,
  status TEXT DEFAULT 'lobby',     -- lobby | question | reveal | ended
  current_question INTEGER DEFAULT -1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  color TEXT DEFAULT '#2DD4BF',
  score INTEGER DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE (room_id, code)
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  team_id INTEGER,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  socket_id TEXT,
  connected INTEGER DEFAULT 1,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_index INTEGER,
  is_correct INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  time_taken REAL,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_teams_room ON teams(room_id);
CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);
