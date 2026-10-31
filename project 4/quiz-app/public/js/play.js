const SESSION_KEY = 'quizuplive_session';

const socket = io();
let countdownTimer = null;
let myTeamId = null;
let myPlayerId = null;
let currentQuestion = null;
let hasAnswered = false;

function view(name) {
  ['joinView', 'waitingView', 'questionView', 'answeredView', 'revealView', 'gameOverView'].forEach((id) => {
    $('#' + id).style.display = id === name ? 'block' : 'none';
  });
}

function saveSession(roomCode, playerId) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function startCountdown(timeLimit, elapsedMs = 0) {
  clearInterval(countdownTimer);
  const ring = $('#pRing');
  const r = 44;
  const circumference = 2 * Math.PI * r;
  ring.style.strokeDasharray = `${circumference}`;

  const startedAt = Date.now() - elapsedMs;
  function tick() {
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(timeLimit - elapsed, 0);
    const fraction = remaining / timeLimit;
    ring.style.strokeDashoffset = `${circumference * (1 - fraction)}`;
    $('#pRingNumber').textContent = Math.ceil(remaining);
    ring.style.stroke = remaining <= 5 ? 'var(--pink)' : 'var(--teal)';
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      if (!hasAnswered) showTimesUp();
    }
  }
  tick();
  countdownTimer = setInterval(tick, 200);
}

function renderQuestion(q) {
  currentQuestion = q;
  hasAnswered = false;
  view('questionView');
  $('#pQuestionProgress').textContent = `Question ${q.index + 1} / ${q.total}`;
  $('#pQuestionText').textContent = q.question_text;

  const grid = $('#pAnswerGrid');
  grid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const tile = el('button', { class: 'answer-tile', 'data-slot': String(i), type: 'button' }, [
      el('span', { class: 'answer-glyph' }, GLYPHS[i] || ''),
      el('span', {}, opt),
    ]);
    tile.addEventListener('click', () => submitAnswer(i));
    grid.appendChild(tile);
  });
}

function submitAnswer(selectedIndex) {
  if (hasAnswered || !currentQuestion) return;
  hasAnswered = true;
  clearInterval(countdownTimer);
  $all('.answer-tile', $('#pAnswerGrid')).forEach((t, i) => {
    t.disabled = true;
    if (i !== selectedIndex) t.classList.add('dimmed');
  });

  socket.emit('player:answer', {
    roomCode: currentQuestion.roomCode,
    questionId: currentQuestion.id,
    selectedIndex,
  }, (res) => {
    if (res && res.error) {
      showToast(res.error);
      return;
    }
    view('answeredView');
    if (res.correct) {
      $('#answerFeedbackIcon').textContent = '✅';
      $('#answerFeedbackTitle').textContent = 'Correct!';
      $('#answerFeedbackSub').textContent = `+${res.pointsAwarded} points — waiting for other players…`;
    } else {
      $('#answerFeedbackIcon').textContent = '❌';
      $('#answerFeedbackTitle').textContent = 'Not quite';
      $('#answerFeedbackSub').textContent = 'Waiting for other players…';
    }
  });
}

function showTimesUp() {
  view('answeredView');
  $('#answerFeedbackIcon').textContent = '⌛';
  $('#answerFeedbackTitle').textContent = "Time's up!";
  $('#answerFeedbackSub').textContent = 'Waiting for other players…';
}

function renderReveal(payload) {
  view('revealView');
  const team = payload.teams.find((t) => t.id === myTeamId);
  const isCorrect = currentQuestion && payload.correctIndex !== undefined && hasAnswered;

  $('#revealIcon').textContent = payload.correctIndex !== null ? '📊' : '📊';
  $('#revealTitle').textContent = 'Results are in';
  const correctOption = currentQuestion ? currentQuestion.options[payload.correctIndex] : '';
  $('#revealSub').textContent = correctOption ? `Correct answer: ${correctOption}` : '';
  $('#revealTeamScore').textContent = team ? `${team.score} pts` : '—';
}

function renderGameOver(payload) {
  view('gameOverView');
  const teamIndex = payload.teams.findIndex((t) => t.id === myTeamId);
  const team = payload.teams[teamIndex];
  $('#finalTeamRank').textContent = teamIndex >= 0 ? ordinal(teamIndex + 1) : '—';

  const me = payload.players.find((p) => p.id === myPlayerId);
  $('#finalPersonalScore').textContent = me ? `You personally scored ${me.score} points on team ${team ? team.name : ''}.` : '';

  const board = $('#finalTeamBoard');
  board.innerHTML = '<h3>All teams</h3>';
  payload.teams.forEach((t, i) => {
    board.appendChild(el('div', { class: 'leader-row' }, [
      el('span', { class: 'leader-rank' }, `${i + 1}`),
      el('span', { class: 'chip-dot', style: `background:${t.color}` }),
      el('span', { class: 'leader-name' }, t.name),
      el('span', { class: 'leader-score' }, `${t.score}`),
    ]));
  });
  clearSession();
}

function attemptResume() {
  const session = loadSession();
  if (!session) return false;
  socket.emit('player:resume', session, (res) => {
    if (!res || res.error) {
      clearSession();
      view('joinView');
      return;
    }
    myPlayerId = res.player.id;
    myTeamId = res.team ? res.team.id : null;
    if (res.room.status === 'lobby') {
      $('#waitingQuizTitle').textContent = res.quizTitle;
      $('#waitingPlayerName').textContent = res.player.name;
      $('#waitingTeamName').textContent = res.team ? res.team.name : '';
      view('waitingView');
    } else if (res.room.status === 'question' && res.currentQuestion) {
      res.currentQuestion.roomCode = session.roomCode;
      if (res.alreadyAnswered) {
        currentQuestion = res.currentQuestion;
        hasAnswered = true;
        view('answeredView');
        $('#answerFeedbackIcon').textContent = '⏳';
        $('#answerFeedbackTitle').textContent = 'Answer locked in';
        $('#answerFeedbackSub').textContent = 'Waiting for other players…';
      } else {
        renderQuestion(res.currentQuestion);
        startCountdown(res.currentQuestion.time_limit, res.elapsedMs || 0);
      }
    } else if (res.room.status === 'ended') {
      clearSession();
      view('joinView');
    } else {
      view('waitingView');
    }
  });
  return true;
}

socket.on('connect', () => {
  attemptResume();
});

socket.on('question:start', (q) => {
  q.roomCode = loadSession() ? loadSession().roomCode : q.roomCode;
  renderQuestion(q);
  startCountdown(q.time_limit);
});

socket.on('question:end', (payload) => {
  renderReveal(payload);
});

socket.on('game:over', (payload) => {
  renderGameOver(payload);
});

$('#joinBtn').addEventListener('click', () => {
  const errBox = $('#joinError');
  hideError(errBox);

  const roomCode = $('#roomCodeInput').value.trim().toUpperCase();
  const playerName = $('#playerNameInput').value.trim();
  const teamCode = $('#teamCodeInput').value.trim();

  if (!roomCode) return showError(errBox, 'Enter the room code your host gave you.');
  if (!playerName) return showError(errBox, 'Enter your name.');
  if (!teamCode) return showError(errBox, 'Enter a team code to join or create a team.');

  $('#joinBtn').disabled = true;
  $('#joinBtn').textContent = 'Joining…';

  socket.emit('player:join', { roomCode, playerName, teamCode }, (res) => {
    $('#joinBtn').disabled = false;
    $('#joinBtn').textContent = 'Join game';

    if (res.error) return showError(errBox, res.error);

    myPlayerId = res.player.id;
    myTeamId = res.team.id;
    saveSession(roomCode, res.player.id);

    $('#waitingQuizTitle').textContent = res.quizTitle;
    $('#waitingPlayerName').textContent = res.player.name;
    $('#waitingTeamName').textContent = res.team.name;
    view('waitingView');
  });
});

// Prefill room code from a ?code= link if present.
(function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) $('#roomCodeInput').value = code.toUpperCase();
})();

// Show the join form immediately; if a saved session exists, the 'connect'
// handler above will switch to the right view once the resume completes.
view('joinView');
