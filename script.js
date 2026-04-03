// 【設定：ここをミズの鍵に書き換えてね】
const GITHUB_TOKEN = "ここに自分の鍵を貼り付けてね"; 
const REPO_OWNER = "自分のGitHubユーザー名"; 
const REPO_NAME = "mizu-message"; // リポジトリ名
const FILE_PATH = "data/mizu_data.json"; // データを保存するファイル

let myUser = JSON.parse(localStorage.getItem('mizu_user')) || null;
let allData = { posts: [], messages: [], users: [] };

// 画面切り替え
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if(myUser) document.getElementById('main-nav').style.display = 'flex';
    
    if(screenId === 'screen-timeline') renderTimeline();
    if(screenId === 'screen-profile') renderProfile();
    if(screenId === 'screen-message') renderMessages();
}

// GitHubからデータを読み込む
async function loadFromGitHub() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if(res.ok) {
            const json = await res.json();
            const content = decodeURIComponent(escape(atob(json.content)));
            allData = JSON.parse(content);
        }
    } catch (e) { console.log("初回データ作成前です"); }
}

// GitHubへデータを保存する
async function saveToGitHub() {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(allData))));
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    
    let sha = "";
    if(res.ok) {
        const json = await res.json();
        sha = json.sha;
    }

    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "update data from mizu message",
            content: content,
            sha: sha
        })
    });
}

async function register() {
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    const id = document.getElementById('reg-id').value;
    const idRegex = /^[a-zA-Z0-9]{6,20}$/;

    if(!email.includes('@') || name.length > 17 || !idRegex.test(id)) {
        return alert('入力ルールを確認してね！');
    }

    await loadFromGitHub();
    // メールアドレスで既存ユーザーを探す（引き継ぎ機能）
    const existingUser = allData.users.find(u => u.email === email);
    
    if(existingUser) {
        myUser = existingUser;
        alert('おかえりなさい！アカウントを引き継ぎました。');
    } else {
        myUser = { email, name, id };
        allData.users.push(myUser);
        await saveToGitHub();
        alert('登録完了！GitHubに保存したよ。');
    }

    localStorage.setItem('mizu_user', JSON.stringify(myUser));
    showScreen('screen-timeline');
}

// メッセージ送信（LINE風・24時間追記・削除不可）
async function sendMsg() {
    const input = document.getElementById('msg-input');
    if(!input.value) return;

    allData.messages.push({
        id: Date.now(),
        text: input.value,
        sender: myUser.id,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        edited: false
    });
    
    await saveToGitHub();
    input.value = '';
    renderMessages();
}

function renderMessages() {
    const box = document.getElementById('chat-box');
    box.innerHTML = allData.messages.map(m => {
        const canEdit = (Date.now() - m.timestamp) < 24 * 60 * 60 * 1000;
        return `<div class="msg-bubble">${m.text}${m.edited ? ' (追記済)' : ''}<div style="font-size:10px;">${m.time} ${canEdit ? `<span onclick="editMsg(${m.id})" style="color:blue; cursor:pointer;">[追記]</span>` : ''}</div></div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

async function editMsg(id) {
    const msg = allData.messages.find(m => m.id === id);
    const addText = prompt('追記する内容：');
    if(addText) {
        msg.text += " " + addText;
        msg.edited = true;
        await saveToGitHub();
        renderMessages();
    }
}

// 投稿機能 (GitHub保存)
async function createPost() {
    const title = document.getElementById('post-title').value;
    const file = document.getElementById('post-file').value;
    if(!title || !file) return;

    allData.posts.unshift({ title, file, sender: myUser.id, timestamp: Date.now() });
    await saveToGitHub();
    alert('投稿をGitHubに保存したよ！');
    showScreen('screen-timeline');
}

function renderTimeline() {
    const list = document.getElementById('timeline-list');
    list.innerHTML = allData.posts.map(p => `
        <div class="post-card"><img src="${p.file}"><div style="padding:10px;"><strong>${p.title}</strong></div></div>
    `).join('');
}

function renderProfile() {
    document.getElementById('prof-display-name').innerText = myUser.name;
    document.getElementById('prof-display-id').innerText = '@' + myUser.id;
    const myPosts = allData.posts.filter(p => p.sender === myUser.id);
    document.getElementById('post-count').innerText = myPosts.length;
    document.getElementById('post-grid').innerHTML = myPosts.map(p => `<div class="ig-post-item"><img src="${p.file}"></div>`).join('');
}

// 起動時
(async () => {
    if(myUser) {
        await loadFromGitHub();
        showScreen('screen-timeline');
    }
})();
