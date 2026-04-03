let myUser = JSON.parse(localStorage.getItem('mizu_user')) || null;
let posts = JSON.parse(localStorage.getItem('mizu_posts')) || [];
let messages = JSON.parse(localStorage.getItem('mizu_msgs')) || [];

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // ログイン済みならナビを出す
    if(myUser) {
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('screen-start').style.height = 'calc(100% - 50px)';
    }
    
    if(screenId === 'screen-profile') renderProfile();
    if(screenId === 'screen-message') renderMessages();
}

function register() {
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    const id = document.getElementById('reg-id').value;
    const idRegex = /^[a-zA-Z0-9]{6,20}$/;

    if(!email.includes('@')) return alert('有効なメールアドレスを入力してね！');
    if(name.length > 17) return alert('名前は17文字までだよ！');
    if(!idRegex.test(id)) return alert('IDは6-20文字の英数字のみ有効だよ！');

    myUser = { email, name, id };
    localStorage.setItem('mizu_user', JSON.stringify(myUser));
    showScreen('screen-profile');
}

function renderProfile() {
    document.getElementById('prof-display-name').innerText = myUser.name;
    document.getElementById('prof-display-id').innerText = '@' + myUser.id;
    const grid = document.getElementById('post-grid');
    grid.innerHTML = posts.map(p => `
        <div class="ig-post-item">
            <img src="${p.file}" onerror="this.src='https://via.placeholder.com/150?text=mizu'">
        </div>
    `).join('');
}

function createPost() {
    const title = document.getElementById('post-title').value;
    const file = document.getElementById('post-file').value;
    if(!title || !file) return alert('タイトルとファイルのURLを入れてね！');

    posts.unshift({ title, file, timestamp: Date.now() });
    localStorage.setItem('mizu_posts', JSON.stringify(posts));
    alert('投稿完了！');
    showScreen('screen-profile');
}

function sendMsg() {
    const input = document.getElementById('msg-input');
    if(!input.value) return;

    const msg = {
        id: Date.now(),
        text: input.value,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        edited: false
    };
    messages.push(msg);
    localStorage.setItem('mizu_msgs', JSON.stringify(messages));
    input.value = '';
    renderMessages();
}

function renderMessages() {
    const box = document.getElementById('chat-box');
    box.innerHTML = messages.map(m => {
        const canEdit = (Date.now() - m.timestamp) < 24 * 60 * 60 * 1000;
        return `
            <div class="msg-bubble">
                ${m.text} ${m.edited ? '<br><small style="font-style:italic;">(追記済)</small>' : ''}
                <div class="msg-time">
                    ${m.time} 
                    ${canEdit ? `<span onclick="editMsg(${m.id})" style="color:blue; cursor:pointer; margin-left:5px;">[追記]</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

function editMsg(id) {
    const msg = messages.find(m => m.id === id);
    const addText = prompt('追記する内容を入力してね：');
    if(addText) {
        msg.text += " " + addText;
        msg.edited = true;
        localStorage.setItem('mizu_msgs', JSON.stringify(messages));
        renderMessages();
    }
}

// 起動時にログイン済みか確認
if(myUser) {
    showScreen('screen-profile');
}
