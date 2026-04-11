// ============================================================
//  mizu accountservice — js.js
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxgUwqUBe3SZ0YIiQrvJR6Yxk-KuJaRtLq51SPCQHNxIJ_6l6JsmSEwxVIf6GiOsEU2/exec';

// ============================================================
//  初期化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNameInput();
  initImageUpload();
  initForm();
  initModal();
});

// ============================================================
//  名前入力：リアルタイム重複チェック
// ============================================================
let nameCheckTimer = null;

function initNameInput() {
  const nameInput    = document.getElementById('input-name');
  const nameStatus   = document.getElementById('name-status');
  const suggestions  = document.getElementById('name-suggestions');

  if (!nameInput) return;

  nameInput.addEventListener('input', () => {
    clearTimeout(nameCheckTimer);
    const val = nameInput.value.trim();

    if (!val) {
      setNameStatus('', '');
      suggestions.innerHTML = '';
      return;
    }

    setNameStatus('loading', 'もう少しお待ちください…');
    suggestions.innerHTML = '';

    nameCheckTimer = setTimeout(() => checkNameAvailability(val), 600);
  });
}

async function checkNameAvailability(name) {
  const nameStatus  = document.getElementById('name-status');
  const suggestions = document.getElementById('name-suggestions');

  try {
    const res  = await fetch(`${GAS_URL}?action=checkName&name=${encodeURIComponent(name)}`);
    const data = await res.json();

    if (data.available) {
      setNameStatus('ok', '✓ この名前は使えます');
      suggestions.innerHTML = '';
    } else {
      setNameStatus('error', '✗ この名前はすでに使われています');
      renderSuggestions(data.suggestions || []);
    }
  } catch (err) {
    setNameStatus('error', '接続エラーが発生しました');
    console.error(err);
  }
}

function setNameStatus(type, msg) {
  const el = document.getElementById('name-status');
  if (!el) return;
  el.textContent  = msg;
  el.dataset.type = type;
}

function renderSuggestions(list) {
  const el = document.getElementById('name-suggestions');
  if (!el) return;

  el.innerHTML = list.length
    ? '<p class="suggest-label">こちらはいかがですか？</p>' +
      list.map(n =>
        `<button type="button" class="suggest-chip" data-name="${n}">${n}</button>`
      ).join('')
    : '';

  // タップで即入力欄に反映
  el.querySelectorAll('.suggest-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const nameInput = document.getElementById('input-name');
      nameInput.value = btn.dataset.name;
      nameInput.dispatchEvent(new Event('input'));
      showToast(`「${btn.dataset.name}」を選択しました`);
    });
  });
}

// ============================================================
//  画像アップロード → Base64変換
// ============================================================
let imageBase64 = '';

function initImageUpload() {
  const fileInput   = document.getElementById('input-image');
  const preview     = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');

  if (!fileInput) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    // サイズ制限: 2MB
    if (file.size > 2 * 1024 * 1024) {
      showToast('画像は2MB以下にしてください', 'error');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      imageBase64 = e.target.result; // data:image/...;base64,...
      if (preview) {
        preview.src   = imageBase64;
        preview.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
//  フォーム送信
// ============================================================
function initForm() {
  const form = document.getElementById('account-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const userId   = document.getElementById('input-id')?.value.trim();
    const password = document.getElementById('input-password')?.value.trim();
    const name     = document.getElementById('input-name')?.value.trim();
    const statusEl = document.getElementById('form-status');

    if (!userId || !password || !name) {
      showToast('すべての項目を入力してください', 'error');
      return;
    }

    const nameStatusType = document.getElementById('name-status')?.dataset.type;
    if (nameStatusType === 'error') {
      showToast('使用できない名前が入力されています', 'error');
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action:      'createAccount',
          userId,
          password,
          name,
          imageBase64: imageBase64 || ''
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast('アカウントを作成しました 🎉');
        form.reset();
        imageBase64 = '';
        const preview = document.getElementById('image-preview');
        if (preview) preview.style.display = 'none';
        const placeholder = document.getElementById('image-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        document.getElementById('name-suggestions').innerHTML = '';
        setNameStatus('', '');
      } else {
        showToast(data.error || '作成に失敗しました', 'error');
      }
    } catch (err) {
      showToast('通信エラーが発生しました', 'error');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  });
}

function setFormLoading(isLoading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.disabled    = isLoading;
  btn.textContent = isLoading ? '作成中…' : 'アカウントを作成する';
}

// ============================================================
//  フォロー一覧モーダル
// ============================================================
function initModal() {
  const trigger   = document.getElementById('follow-count');
  const modal     = document.getElementById('follow-modal');
  const overlay   = document.getElementById('modal-overlay');
  const closeBtn  = document.getElementById('modal-close');
  const listEl    = document.getElementById('follow-list');

  if (!trigger || !modal) return;

  trigger.addEventListener('click', async () => {
    const userId = trigger.dataset.userId;
    if (!userId) return;

    openModal();
    listEl.innerHTML = '<p class="modal-loading">読み込み中…</p>';

    try {
      const res  = await fetch(`${GAS_URL}?action=getFollows&userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (data.follows && data.follows.length) {
        listEl.innerHTML = data.follows.map(f => `
          <div class="follow-item">
            <img class="follow-avatar"
                 src="${f.image || 'https://placehold.co/40x40/1a1a1a/555?text=?'}"
                 alt="${f.name}">
            <span class="follow-name">${f.name}</span>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<p class="modal-empty">フォロー中のユーザーはいません</p>';
      }
    } catch (err) {
      listEl.innerHTML = '<p class="modal-empty">取得に失敗しました</p>';
    }
  });

  overlay?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal() {
  document.getElementById('follow-modal')?.classList.add('open');
  document.getElementById('modal-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('follow-modal')?.classList.remove('open');
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
//  名前コピー → Gemini流トースト演出
// ============================================================
document.addEventListener('click', e => {
  if (e.target.closest('[data-copy]')) {
    const text = e.target.closest('[data-copy]').dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`「${text}」をコピーしました`);
    });
  }
});

// ============================================================
//  トースト通知（Gemini流：下から滑り込み、波紋エフェクト）
// ============================================================
let toastQueue = [];
let toastActive = false;

function showToast(message, type = 'success') {
  toastQueue.push({ message, type });
  if (!toastActive) processToastQueue();
}

function processToastQueue() {
  if (!toastQueue.length) { toastActive = false; return; }

  toastActive = true;
  const { message, type } = toastQueue.shift();

  const container = document.getElementById('toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'error' ? '✕' : '✓'}</span>
    <span class="toast-msg">${message}</span>
    <span class="toast-ripple"></span>
  `;

  container.appendChild(toast);

  // アニメーション: 登場
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--in'));
  });

  // 退場
  setTimeout(() => {
    toast.classList.remove('toast--in');
    toast.classList.add('toast--out');
    toast.addEventListener('transitionend', () => {
      toast.remove();
      setTimeout(processToastQueue, 100);
    }, { once: true });
  }, 2800);
}

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toast-container';
  document.body.appendChild(el);
  return el;
}
