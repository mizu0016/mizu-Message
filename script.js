// 【重要】自分の情報を正しく入れてね
const GITHUB_TOKEN = "ここにghp_から始まる自分の鍵を貼る"; 
const REPO_OWNER = "mizu0016"; 
const REPO_NAME = "mizu-Message-"; 
const DATA_FILE = "data/mizu_data.json";

let myUser = JSON.parse(localStorage.getItem('mizu_user')) || null;
let allData = { posts: [], messages: [], users: [] };
let activeChatId = null;
let myFriends = JSON.parse(localStorage.getItem('mizu_friends')) || [];

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if(target) target.classList.add('active');
    
    if(myUser) document.getElementById('main-nav').style.display = 'flex';
    
    if(screenId === 'screen-chat-list') renderChatList();
    if(screenId === 'screen-timeline') renderTimeline();
    if(screenId === 'screen-profile') renderProfile();
}

async function loadData() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if(res.ok) {
            const json = await res.json();
            allData = JSON.parse(decodeURIComponent(escape(atob(json.content))));
        }
    } catch (e) { console.log("Data load error"); }
}

async function saveData() {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(allData))));
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    let sha = res.ok ? (await res.json()).sha : "";

    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`, {
        method: "PUT",
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Update Data", content, sha })
    });
}

function openSearch() { document.getElementById('search-modal').style.display = 'flex'; }
function closeSearch() { document.getElementById('search-modal').style.display = 'none'; }

async function searchUser() {
    const sid = document.getElementById('search-id-input').value;
    await loadData();
    const found = allData.users.find(u => u.id === sid);
    const resDiv = document.getElementById('search-result');
    if(found && found.id !== myUser.id) {
        resDiv.innerHTML = `${found.name}さん発見！<br><button class="btn-main" onclick="addFriend('${found.id}','${found.name}')">追加</button>`;
    } else {
        resDiv.innerText = "ユーザーが見つかりません";
    }
}

function addFriend(id, name) {
    if(!myFriends.find(f => f.id === id)) {
        myFriends.push({id, name});
        localStorage.setItem('mizu_friends', JSON.stringify(myFriends));
    }
    closeSearch();
    renderChatList();
}

function renderChatList() {
    const list = document.getElementById('chat-user-list');
    if(myFriends.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">🔍から友達を追加してね</p>';
        return;
    }
    list.innerHTML = myFriends.map(f => `
        <div class="chat-user-item" onclick="openChat('${f.id}','${f.name}')">
            <div class="chat-user-avatar"></div>
            <div class="chat-user-info">
                <div class="chat-user-name">${f.name}</div>
                <div class="chat-user-last-msg">@${f.id}</div>
            </div>
        </div>
    `).join('');
}

function openChat(id, name) {
    activeChatId = id;
    document.getElementById('current-chat-target').innerText = name;
    showScreen('screen-message');
    renderMessages();
}

function renderMessages() {
    const box = document.getElementById('chat-box');
    const msgs = allData.messages.filter(m => 
        (m.sender === myUser.id && m.receiver === activeChatId) || (m.sender === activeChatId && m.receiver === myUser.id)
    );
    box.innerHTML = msgs.map(m => `
        <div class="msg-bubble ${m.sender === myUser.id ? 'msg-me' : ''}">${m.text}</div>
    `).join('');
    box.scrollTop = box.scrollHeight;
}

async function sendMsg() {
    const input = document.getElementById('msg-input');
    if(!input.value) return;
    allData.messages.push({
        sender: myUser.id, receiver: activeChatId, text: input.value, timestamp: Date.now()
    });
    await saveData();
    input.value = '';
    renderMessages();
}

async function register() {
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    const id = document.getElementById('reg-id').value;
    if(!email || !name || !id) return alert("全部入力してね");

    await loadData();
    let user = allData.users.find(u => u.email === email);
    if(!user) {
        user = {email, name, id};
        allData.users.push(user);
        await saveData();
    }
    myUser = user;
    localStorage.setItem('mizu_user', JSON.stringify(myUser));
    showScreen('screen-timeline');
}

function renderProfile() {
    document.getElementById('prof-display-name').innerText = myUser.name;
    document.getElementById('prof-display-id').innerText = '@' + myUser.id;
    const myPosts = allData.posts.filter(p => p.sender === myUser.id);
    document.getElementById('post-count').innerText = myPosts.length;
    document.getElementById('post-grid').innerHTML = myPosts.map(p => `
        <div class="ig-post-item">
            ${p.type==='video'?`<video src="${p.fileData}"></video>`:`<img src="${p.fileData}">`}
        </div>
    `).join('');
}

async function createPost() {
    const title = document.getElementById('post-title').value;
    const file = document.getElementById('post-file-input').files[0];
    if(!title || !file) return alert("タイトルとファイルを選んでね");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        allData.posts.unshift({
            title, fileData: reader.result, type: file.type.startsWith('video')?'video':'image', sender: myUser.id
        });
        await saveData();
        alert("投稿完了！");
        showScreen('screen-timeline');
    };
}

function renderTimeline() {
    const list = document.getElementById('timeline-list');
    list.innerHTML = allData.posts.map(p => `
        <div class="post-card">
            ${p.type==='video'?`<video src="${p.fileData}" controls></video>`:`<img src="${p.fileData}">`}
            <div><strong>${p.title}</strong></div>
        </div>
    `).join('');
}

// 起動処理
(async () => {
    if(myUser) {
        await loadData();
        showScreen('screen-timeline');
    }
})();
