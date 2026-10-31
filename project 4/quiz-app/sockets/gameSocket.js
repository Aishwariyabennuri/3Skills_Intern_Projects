const { rooms, quizzes, questions, teams, players, answers } = require('../db/database');

// In-memory live state per room code. The DB is the source of truth for
// scores/history; this map just tracks what only matters while a game is
// actually running (timers, who has answered the current question, etc).
const liveRooms = new Map();

const TEAM_COLORS = ['#2DD4BF', '#F5C518', '#FF3E7F', '#8B7CF6', '#5EEAD4', '#FCA5A5', '#93C5FD', '#FDBA74'];

function roomChannel(code) {
  return `room-${code}`;
}
function hostChannel(code) {
  return `host-${code}`;
}

function publicQuestion(q, index, total) {
  return {
    id: q.id,
    index,
    total,
    question_text: q.question_text,
    options: JSON.parse(q.options),
    time_limit: q.time_limit,
    points: q.points,
  };
}

function getLeaderboards(roomId) {
  const teamBoard = teams.getTeamsForRoom.all(roomId);
  const playerBoard = players.getPlayersForRoom.all(roomId).map((p) => ({
    id: p.id,
    name: p.name,
    team_id: p.team_id,
    score: p.score,
    connected: !!p.connected,
  }));
  return { teams: teamBoard, players: playerBoard };
}

function connectedPlayerCount(roomId) {
  return players.getPlayersForRoom.all(roomId).filter((p) => p.connected).length;
}

module.exports = function attachGameSocket(io) {
  function broadcastRoomState(code) {
    const state = liveRooms.get(code);
    if (!state) return;
    const { teams: teamBoard, players: playerBoard } = getLeaderboards(state.roomId);
    io.to(roomChannel(code)).emit('room:state', {
      code,
      status: state.status,
      quizTitle: state.quizTitle,
      questionCount: state.questions.length,
      currentIndex: state.currentIndex,
      teams: teamBoard,
      players: playerBoard,
    });
  }

  function clearTimer(state) {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function startQuestion(code, index) {
    const state = liveRooms.get(code);
    if (!state) return;
    clearTimer(state);

    const q = state.questions[index];
    if (!q) {
      endGame(code);
      return;
    }

    state.currentIndex = index;
    state.status = 'question';
    state.answeredPlayerIds = new Set();
    state.questionStartTime = Date.now();

    rooms.updateRoomQuestion.run(index, 'question', state.roomId);

    io.to(roomChannel(code)).emit('question:start', publicQuestion(q, index, state.questions.length));
    io.to(hostChannel(code)).emit('answer:progress', {
      answeredCount: 0,
      totalPlayers: connectedPlayerCount(state.roomId),
    });

    state.timer = setTimeout(() => revealQuestion(code), q.time_limit * 1000 + 400);
  }

  function revealQuestion(code) {
    const state = liveRooms.get(code);
    if (!state || state.status !== 'question') return;
    clearTimer(state);

    const q = state.questions[state.currentIndex];
    const questionAnswers = answers.getAnswersForQuestion.all(q.id);
    const tally = JSON.parse(q.options).map((_, i) => questionAnswers.filter((a) => a.selected_index === i).length);

    state.status = 'reveal';
    rooms.updateRoomStatus.run('reveal', state.roomId);

    const { teams: teamBoard, players: playerBoard } = getLeaderboards(state.roomId);

    io.to(roomChannel(code)).emit('question:end', {
      questionId: q.id,
      correctIndex: q.correct_index,
      tally,
      answeredCount: questionAnswers.length,
      totalPlayers: connectedPlayerCount(state.roomId),
      teams: teamBoard,
      players: playerBoard,
      isLastQuestion: state.currentIndex >= state.questions.length - 1,
    });
  }

  function endGame(code) {
    const state = liveRooms.get(code);
    if (!state) return;
    clearTimer(state);
    state.status = 'ended';
    rooms.updateRoomStatus.run('ended', state.roomId);
    const { teams: teamBoard, players: playerBoard } = getLeaderboards(state.roomId);
    io.to(roomChannel(code)).emit('game:over', { teams: teamBoard, players: playerBoard });
  }

  io.on('connection', (socket) => {
    // ---------------- HOST ----------------
    socket.on('host:join', ({ roomCode }, cb) => {
      try {
        const code = String(roomCode || '').trim().toUpperCase();
        const room = rooms.getRoomByCode.get(code);
        if (!room) return cb && cb({ error: 'Room not found.' });

        const quiz = quizzes.getQuiz.get(room.quiz_id);
        let state = liveRooms.get(code);
        if (!state) {
          const qs = questions.getQuestionsForQuiz.all(room.quiz_id);
          state = {
            roomId: room.id,
            quizId: room.quiz_id,
            quizTitle: quiz.title,
            questions: qs,
            currentIndex: room.current_question,
            status: room.status,
            timer: null,
            answeredPlayerIds: new Set(),
            questionStartTime: null,
          };
          liveRooms.set(code, state);
        }

        socket.join(roomChannel(code));
        socket.join(hostChannel(code));
        socket.data.roomCode = code;
        socket.data.isHost = true;

        const { teams: teamBoard, players: playerBoard } = getLeaderboards(state.roomId);
        cb &&
          cb({
            room: { code, status: state.status, currentIndex: state.currentIndex },
            quizTitle: state.quizTitle,
            totalQuestions: state.questions.length,
            currentQuestion:
              state.status === 'question'
                ? publicQuestion(state.questions[state.currentIndex], state.currentIndex, state.questions.length)
                : null,
            elapsedMs: state.questionStartTime ? Date.now() - state.questionStartTime : 0,
            teams: teamBoard,
            players: playerBoard,
          });
      } catch (err) {
        cb && cb({ error: 'Could not join as host.' });
      }
    });

    socket.on('host:start', ({ roomCode }) => {
      const code = String(roomCode || '').trim().toUpperCase();
      const state = liveRooms.get(code);
      if (!state) return;
      if (state.questions.length === 0) return;
      startQuestion(code, 0);
    });

    socket.on('host:next', ({ roomCode }) => {
      const code = String(roomCode || '').trim().toUpperCase();
      const state = liveRooms.get(code);
      if (!state) return;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        endGame(code);
      } else {
        startQuestion(code, nextIndex);
      }
    });

    socket.on('host:reveal', ({ roomCode }) => {
      const code = String(roomCode || '').trim().toUpperCase();
      revealQuestion(code);
    });

    socket.on('host:end', ({ roomCode }) => {
      const code = String(roomCode || '').trim().toUpperCase();
      endGame(code);
    });

    // ---------------- PLAYER ----------------
    socket.on('player:join', ({ roomCode, playerName, teamCode }, cb) => {
      try {
        const code = String(roomCode || '').trim().toUpperCase();
        const name = String(playerName || '').trim().slice(0, 24);
        const tCode = String(teamCode || '').trim().slice(0, 20);

        if (!code) return cb && cb({ error: 'Enter a room code.' });
        if (!name) return cb && cb({ error: 'Enter your name.' });
        if (!tCode) return cb && cb({ error: 'Enter a team code to join or create a team.' });

        const room = rooms.getRoomByCode.get(code);
        if (!room) return cb && cb({ error: 'No game found with that room code.' });
        if (room.status !== 'lobby') {
          return cb && cb({ error: 'This game has already started. Ask the host for a new room code.' });
        }

        let state = liveRooms.get(code);
        if (!state) {
          const quiz = quizzes.getQuiz.get(room.quiz_id);
          const qs = questions.getQuestionsForQuiz.all(room.quiz_id);
          state = {
            roomId: room.id,
            quizId: room.quiz_id,
            quizTitle: quiz.title,
            questions: qs,
            currentIndex: room.current_question,
            status: room.status,
            timer: null,
            answeredPlayerIds: new Set(),
            questionStartTime: null,
          };
          liveRooms.set(code, state);
        }

        const normalizedTeamCode = tCode.toUpperCase();
        let team = teams.getTeamByCode.get(room.id, normalizedTeamCode);
        if (!team) {
          const existingCount = teams.getTeamsForRoom.all(room.id).length;
          const color = TEAM_COLORS[existingCount % TEAM_COLORS.length];
          const result = teams.createTeam.run(room.id, tCode, normalizedTeamCode, color);
          team = teams.getTeamByCode.get(room.id, normalizedTeamCode);
        }

        const result = players.createPlayer.run(room.id, team.id, name, socket.id);
        const player = players.getPlayer.get(result.lastInsertRowid);

        socket.join(roomChannel(code));
        socket.data.roomCode = code;
        socket.data.playerId = player.id;
        socket.data.isHost = false;

        cb &&
          cb({
            player: { id: player.id, name: player.name, score: player.score },
            team: { id: team.id, name: team.name, code: team.code, color: team.color },
            room: { code, status: state.status },
            quizTitle: state.quizTitle,
            totalQuestions: state.questions.length,
          });

        broadcastRoomState(code);
      } catch (err) {
        cb && cb({ error: 'Something went wrong joining the game.' });
      }
    });

    // Reconnect helper: lets a player's browser resume mid-game after a refresh.
    socket.on('player:resume', ({ roomCode, playerId }, cb) => {
      const code = String(roomCode || '').trim().toUpperCase();
      const state = liveRooms.get(code);
      const player = players.getPlayer.get(playerId);
      if (!state || !player || player.room_id !== state.roomId) {
        return cb && cb({ error: 'Could not resume your session.' });
      }
      players.updatePlayerSocket.run(socket.id, player.id);
      socket.join(roomChannel(code));
      socket.data.roomCode = code;
      socket.data.playerId = player.id;

      const team = teams.getTeamsForRoom.all(state.roomId).find((t) => t.id === player.team_id);

      cb &&
        cb({
          player: { id: player.id, name: player.name, score: player.score },
          team: team ? { id: team.id, name: team.name, code: team.code, color: team.color } : null,
          room: { code, status: state.status },
          quizTitle: state.quizTitle,
          totalQuestions: state.questions.length,
          currentQuestion:
            state.status === 'question'
              ? publicQuestion(state.questions[state.currentIndex], state.currentIndex, state.questions.length)
              : null,
          alreadyAnswered: state.answeredPlayerIds.has(player.id),
        });
      broadcastRoomState(code);
    });

    socket.on('player:answer', ({ roomCode, questionId, selectedIndex }, cb) => {
      try {
        const code = String(roomCode || '').trim().toUpperCase();
        const state = liveRooms.get(code);
        const playerId = socket.data.playerId;
        if (!state || !playerId) return cb && cb({ error: 'You are not connected to a game.' });
        if (state.status !== 'question') return cb && cb({ error: 'This question is no longer open.' });

        const q = state.questions[state.currentIndex];
        if (!q || q.id !== questionId) return cb && cb({ error: 'That question has already ended.' });
        if (state.answeredPlayerIds.has(playerId)) return cb && cb({ error: 'You already answered.' });

        state.answeredPlayerIds.add(playerId);

        const elapsedSec = Math.min(Math.max((Date.now() - state.questionStartTime) / 1000, 0), q.time_limit);
        const isCorrect = Number.isInteger(selectedIndex) && selectedIndex === q.correct_index;
        const speedFactor = 1 - elapsedSec / q.time_limit;
        const points = isCorrect ? Math.round(q.points * (0.5 + 0.5 * speedFactor)) : 0;

        answers.createAnswer.run({
          player_id: playerId,
          question_id: q.id,
          selected_index: Number.isInteger(selectedIndex) ? selectedIndex : null,
          is_correct: isCorrect ? 1 : 0,
          points_awarded: points,
          time_taken: elapsedSec,
        });

        if (points > 0) players.addPlayerScore.run(points, playerId);
        const player = players.getPlayer.get(playerId);
        if (points > 0 && player.team_id) teams.addTeamScore.run(points, player.team_id);

        cb && cb({ correct: isCorrect, pointsAwarded: points, correctIndex: null });

        const totalConnected = connectedPlayerCount(state.roomId);
        io.to(hostChannel(code)).emit('answer:progress', {
          answeredCount: state.answeredPlayerIds.size,
          totalPlayers: totalConnected,
        });

        if (state.answeredPlayerIds.size >= totalConnected && totalConnected > 0) {
          revealQuestion(code);
        }
      } catch (err) {
        cb && cb({ error: 'Could not submit your answer.' });
      }
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      if (!code) return;
      if (!socket.data.isHost && socket.data.playerId) {
        players.setPlayerDisconnected.run(socket.id);
        broadcastRoomState(code);
      }
    });
  });
};
