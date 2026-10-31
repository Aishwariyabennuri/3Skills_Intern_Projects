let questionCount = 0;

function blankQuestion() {
  questionCount += 1;
  const idx = questionCount;
  return { idx };
}

function renderQuestionCard(q) {
  const wrap = el('div', { class: 'qbuilder-item', 'data-idx': q.idx });

  const head = el('div', { class: 'qbuilder-item-head' }, [
    el('strong', {}, `Question ${$all('.qbuilder-item', $('#questionsWrap')).length + 1}`),
    el('button', {
      class: 'btn btn--ghost btn--sm',
      type: 'button',
      onclick: () => { wrap.remove(); renumberQuestions(); },
    }, 'Remove'),
  ]);
  wrap.appendChild(head);

  const qField = el('div', { class: 'field' }, [
    el('label', {}, 'Question'),
    el('input', { type: 'text', class: 'q-text', placeholder: 'What year did this happen?', maxlength: '240' }),
  ]);
  wrap.appendChild(qField);

  const optionsWrap = el('div', { class: 'options-wrap' });
  const groupName = `correct-${q.idx}`;
  ['A', 'B', 'C', 'D'].forEach((label, i) => {
    const row = el('div', { class: 'option-row' }, [
      el('input', { type: 'radio', name: groupName, class: 'q-correct', value: String(i), ...(i === 0 ? { checked: 'checked' } : {}) }),
      el('input', { type: 'text', class: 'q-option', placeholder: `Option ${label}`, maxlength: '120' }),
    ]);
    optionsWrap.appendChild(row);
  });
  wrap.appendChild(optionsWrap);
  wrap.appendChild(el('p', { class: 'hint' }, 'Select the radio button next to the correct answer.'));

  const settingsRow = el('div', { class: 'field-row' }, [
    el('div', { class: 'field' }, [
      el('label', {}, 'Time limit (seconds)'),
      el('input', { type: 'number', class: 'q-time', value: '20', min: '5', max: '120' }),
    ]),
    el('div', { class: 'field' }, [
      el('label', {}, 'Max points'),
      el('input', { type: 'number', class: 'q-points', value: '1000', min: '100', max: '5000', step: '100' }),
    ]),
  ]);
  wrap.appendChild(settingsRow);

  return wrap;
}

function renumberQuestions() {
  $all('.qbuilder-item', $('#questionsWrap')).forEach((item, i) => {
    $('.qbuilder-item-head strong', item).textContent = `Question ${i + 1}`;
  });
}

function addQuestion() {
  const card = renderQuestionCard(blankQuestion());
  $('#questionsWrap').appendChild(card);
}

function openBuilder() {
  $('#builderCard').style.display = 'block';
  $('#questionsWrap').innerHTML = '';
  questionCount = 0;
  hideError($('#builderError'));
  $('#quizTitle').value = '';
  $('#quizDesc').value = '';
  addQuestion();
  addQuestion();
  $('#builderCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeBuilder() {
  $('#builderCard').style.display = 'none';
}

function collectQuizPayload() {
  const title = $('#quizTitle').value.trim();
  const description = $('#quizDesc').value.trim();
  const questions = $all('.qbuilder-item', $('#questionsWrap')).map((item) => {
    const question_text = $('.q-text', item).value.trim();
    const options = $all('.q-option', item).map((inp) => inp.value.trim()).filter((v) => v.length > 0);
    const correctRadio = $all('.q-correct', item).find((r) => r.checked);
    const correct_index = correctRadio ? Number(correctRadio.value) : 0;
    const time_limit = Number($('.q-time', item).value) || 20;
    const points = Number($('.q-points', item).value) || 1000;
    return { question_text, options, correct_index, time_limit, points };
  });
  return { title, description, questions };
}

async function saveQuiz() {
  const errBox = $('#builderError');
  hideError(errBox);
  const payload = collectQuizPayload();

  if (!payload.title) return showError(errBox, 'Give your quiz a title.');
  if (payload.questions.length === 0) return showError(errBox, 'Add at least one question.');
  for (const [i, q] of payload.questions.entries()) {
    if (!q.question_text) return showError(errBox, `Question ${i + 1} needs text.`);
    if (q.options.length < 2) return showError(errBox, `Question ${i + 1} needs at least 2 filled-in options.`);
    if (q.correct_index >= q.options.length) return showError(errBox, `Question ${i + 1}: pick a correct answer among the filled options.`);
  }

  try {
    $('#saveQuizBtn').disabled = true;
    await apiFetch('/api/quizzes', { method: 'POST', body: JSON.stringify(payload) });
    closeBuilder();
    showToast('Quiz saved.');
    loadQuizzes();
  } catch (err) {
    showError(errBox, err.message);
  } finally {
    $('#saveQuizBtn').disabled = false;
  }
}

async function hostQuiz(quizId, btn) {
  try {
    btn.disabled = true;
    btn.textContent = 'Opening room…';
    const room = await apiFetch('/api/rooms', { method: 'POST', body: JSON.stringify({ quiz_id: quizId }) });
    window.location.href = `/host-room.html?code=${room.code}`;
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
    btn.textContent = 'Host this quiz';
  }
}

async function deleteQuiz(quizId) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  try {
    await apiFetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
    showToast('Quiz deleted.');
    loadQuizzes();
  } catch (err) {
    showToast(err.message);
  }
}

async function loadQuizzes() {
  const list = $('#quizList');
  list.innerHTML = '<div class="row muted"><span class="spinner"></span> Loading your quizzes…</div>';
  try {
    const quizzes = await apiFetch('/api/quizzes');
    if (quizzes.length === 0) {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'empty-state' }, [
        el('p', { style: 'margin:0;' }, 'No quizzes yet. Create one to get a room code you can share.'),
      ]));
      return;
    }
    list.innerHTML = '';
    quizzes.forEach((quiz) => {
      const item = el('div', { class: 'quiz-list-item' }, [
        el('div', {}, [
          el('strong', {}, quiz.title),
          el('div', { class: 'muted' }, `${quiz.questionCount} question${quiz.questionCount === 1 ? '' : 's'}${quiz.description ? ' · ' + quiz.description : ''}`),
        ]),
        el('div', { class: 'row' }, [
          el('button', { class: 'btn btn--ghost btn--sm', onclick: () => deleteQuiz(quiz.id) }, 'Delete'),
          el('button', {
            class: 'btn btn--primary btn--sm',
            onclick: (e) => hostQuiz(quiz.id, e.currentTarget),
          }, 'Host this quiz'),
        ]),
      ]);
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = '';
    showToast(err.message);
  }
}

$('#newQuizBtn').addEventListener('click', openBuilder);
$('#cancelBuilderBtn').addEventListener('click', closeBuilder);
$('#addQuestionBtn').addEventListener('click', addQuestion);
$('#saveQuizBtn').addEventListener('click', saveQuiz);

loadQuizzes();
