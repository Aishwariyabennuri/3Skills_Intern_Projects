const params = new URLSearchParams(window.location.search);
const roomCode = (params.get('code') || '').trim().toUpperCase();

if (!roomCode) {
  window.location.href = '/host.html';
}

$('#roomCodeDisplay').textContent = roomCode;
$('#joinUrlText').textContent = `${window.location.origin}/play.html`;

const socket = io();
let countdownTimer = null;
let currentTimeLimit = 20;

function view(name) {
  ['loadingView', 'lobbyView', 'questionView', 'revealView', 'gameOverView'].forEach((id) => {
    $('#' + id).style.display = id === name ? 'block' : 'none';
  });
}

function renderTeamChips(teams, players) {
  const wrap = $('#teamChips');
  wrap.innerHTML = '';
  if (teams.length === 0) {
    $('#lobbyEmpty').style.display = 'block';
    return;
  }
  $('#lobbyEmpty').style.display = 'none';
  teams.forEach((team) => {
    const count = players.filter((p) => p.team_id === team.id && p.connected).length;
    wrap.appendChild(el('div', { class: 'chip' }, [
      el('span', { class: 'chip-dot', style: `background:${team.color}` }),
      `${team.name}`,
      el('span', { class: 'chip-count' }, `${count} player${count === 1 ? '' : 's'}`),
    ]));
  });
}

function updateLobby(state) {
  const connectedPlayers = state.players.filter((p) => p.connected);
  $('#playerCountLabel').textContent = `(${connectedPlayers.length} player${connectedPlayers.length === 1 ? '' : 's'})`;
  $('#startBtn').disabled = connectedPlayers.length === 0;
  renderTeamChips(state.teams, state.players);
}

function startCountdown(timeLimit, elapsedMs = 0) {
  clearInterval(countdownTimer);
  currentTimeLimit = timeLimit;
  const ring = $('#hostRing');
  const r = 44;
  const circumference = 2 * Math.PI * r;
  ring.style.strokeDasharray = `${circumference}`;

  const startedAt = Date.now() - elapsedMs;
  function tick() {
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(timeLimit - elapsed, 0);
    const fraction = remaining / timeLimit;
    ring.style.strokeDashoffset = `${circumference * (1 - fraction)}`;
    $('#hostRingNumber').textContent = Math.ceil(remaining);
    ring.style.stroke = remaining <= 5 ? 'var(--pink)' : 'var(--teal)';
    if (remaining <= 0) clearInterval(countdownTimer);
  }
  tick();
  countdownTimer = setInterval(tick, 200);
}

function renderQuestion(q) {
  view('questionView');
  $('#questionProgressBadge').textContent = `Question ${q.index + 1} / ${q.total}`;
  $('#hostQuestionText').textContent = q.question_text;
  $('#answerProgressLabel').textContent = `0 of 0 answered`;

  const grid = $('#hostAnswerGrid');
  grid.innerHTML = '';
  q.options.forEach((opt, i) => {
    grid.appendChild(el('div', { class: 'answer-tile', 'data-slot': String(i) }, [
      el('span', { class: 'answer-glyph' }, GLYPHS[i] || ''),
      el('span', {}, opt),
    ]));
  });

  startCountdown(q.time_limit);
}

function renderReveal(payload, questionText) {
  clearInterval(countdownTimer);
  view('revealView');
  $('#revealQuestionText').textContent = questionText || '';

  const tallyWrap = $('#revealTally');
  tallyWrap.innerHTML = '';
  const maxCount = Math.max(...payload.tally, 1);
  payload.tally.forEach((count, i) => {
    const pct = Math.round((count / maxCount) * 100);
    const isCorrect = i === payload.correctIndex;
    tallyWrap.appendChild(el('div', {}, [
      el('div', { class: 'row', style: 'margin-bottom:4px;' }, [
        el('span', { class: 'answer-glyph', style: `color:${isCorrect ? 'var(--success)' : 'var(--text-faint)'}` }, GLYPHS[i] || ''),
        el('strong', {}, `${count} answer${count === 1 ? '' : 's'}`),
        isCorrect ? el('span', { class: 'badge', style: 'background: rgba(55,214,122,0.15); color:#8CF0B4; border-color: rgba(55,214,122,0.3);' }, 'Correct') : null,
      ]),
      el('div', { style: `height:10px; border-radius:6px; background:var(--panel-alt); overflow:hidden;` }, [
        el('div', { style: `height:100%; width:${pct}%; background:${isCorrect ? 'var(--success)' : 'var(--purple)'};` }),
      ]),
    ]));
  });

  const leaderWrap = $('#revealLeaderboard');
  leaderWrap.innerHTML = '';
  payload.teams.slice(0, 8).forEach((team, i) => {
    leaderWrap.appendChild(el('div', { class: 'leader-row' }, [
      el('span', { class: 'leader-rank' }, `${i + 1}`),
      el('span', { class: 'chip-dot', style: `background:${team.color}` }),
      el('span', { class: 'leader-name' }, team.name),
      el('span', { class: 'leader-score' }, `${team.score}`),
    ]));
  });

  $('#nextBtn').textContent = payload.isLastQuestion ? 'Show final results' : 'Next question';
}

function renderGameOver(payload) {
  view('gameOverView');
  const podium = $('#finalPodium');
  podium.innerHTML = '';
  const top3 = payload.teams.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]);
  order.forEach((i) => {
    const team = top3[i];
    const medal = ['🥇', '🥈', '🥉'][i];
    podium.appendChild(el('div', { class: `podium-place rank-${i + 1}` }, [
      el('div', { class: 'podium-medal' }, medal),
      el('div', { class: 'podium-name' }, team.name),
      el('div', { class: 'podium-score' }, `${team.score} pts`),
      el('div', { class: 'podium-bar' }),
    ]));
  });

  const board = $('#finalTeamBoard');
  board.innerHTML = '<h3>All teams</h3>';
  payload.teams.forEach((team, i) => {
    board.appendChild(el('div', { class: 'leader-row' }, [
      el('span', { class: 'leader-rank' }, `${i + 1}`),
      el('span', { class: 'chip-dot', style: `background:${team.color}` }),
      el('span', { class: 'leader-name' }, team.name),
      el('span', { class: 'leader-score' }, `${team.score}`),
    ]));
  });
}

let lastQuestionText = '';

socket.on('connect', () => {
  socket.emit('host:join', { roomCode }, (res) => {
    if (res.error) {
      showToast(res.error);
      setTimeout(() => (window.location.href = '/host.html'), 1500);
      return;
    }
    $('#lobbyQuizTitle').textContent = res.quizTitle;
    if (res.room.status === 'lobby') {
      view('lobbyView');
      updateLobby(res);
    } else if (res.room.status === 'question' && res.currentQuestion) {
      lastQuestionText = res.currentQuestion.question_text;
      renderQuestion(res.currentQuestion);
      startCountdown(res.currentQuestion.time_limit, res.elapsedMs);
    } else if (res.room.status === 'ended') {
      renderGameOver(res);
    } else {
      view('lobbyView');
      updateLobby(res);
    }
  });
});

socket.on('room:state', (state) => {
  if (state.status === 'lobby') updateLobby(state);
});

socket.on('question:start', (q) => {
  lastQuestionText = q.question_text;
  renderQuestion(q);
});

socket.on('answer:progress', ({ answeredCount, totalPlayers }) => {
  $('#answerProgressLabel').textContent = `${answeredCount} of ${totalPlayers} answered`;
});

socket.on('question:end', (payload) => {
  renderReveal(payload, lastQuestionText);
});

socket.on('game:over', (payload) => {
  renderGameOver(payload);
});

$('#startBtn').addEventListener('click', () => socket.emit('host:start', { roomCode }));
$('#revealBtn').addEventListener('click', () => socket.emit('host:reveal', { roomCode }));
$('#nextBtn').addEventListener('click', () => socket.emit('host:next', { roomCode }));
