// ミズが教えてくれたURLだよ
const GAS_URL = "https://script.google.com/macros/s/AKfycbxJwArm-HZHKbmf1Dcvm6cTXDAtHjK1RUVc2JQrOLjJ4gFxF6vVpn2lK01QgIRhso4CeA/exec";

let myUser = JSON.parse(localStorage.getItem('mizu_user')) || null;
// 【修正】usersにavatarDataを持たせる想定
let allData = { posts: [], messages: [], users: [] };
let activeChatId = null;
let myFriends = JSON.parse(localStorage.getItem('mizu_friends')) || [];

// 【追加】デフォルトのアバター画像（グレーの丸）Base64
const DEFAULT_AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88f78fwAJZAPO4jVfKgAAAABJRU5ErkJggg==";

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
        const res = await fetch(GAS_URL);
        const json = await res.json();
        if(json && json.length > 0) {
            // スプレッドシートの最新の行にあるデータを読み込む
            const lastRowData = json[json.length - 1][3]; // 4列目にJSONが入っている想定
            allData = JSON.parse(lastRowData);
            
            // 【重要】自分の最新データをmyUserに反映
            if(myUser) {
                const updatedMe = allData.users.find(u => u.id === myUser.id);
                if(updatedMe) {
                    myUser = updatedMe;
                    localStorage.setItem('mizu_user', JSON.stringify(myUser));
                }
            }
        }
    } catch (e) { console.log("読み込みエラー:", e); }
}

async function saveData() {
    try {
        await fetch(GAS_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(allData)
        });
    } catch (e) { console.log("保存エラー:", e); }
}

// 【追加】ユーザーIDからアバター画像を取得するヘルパー
function getUserAvatar(userId) {
    const user = allData.users.find(u => u.id === userId);
    return (user && user.avatarData) ? user.avatarData : DEFAULT_AVATAR;
}
// 【追加】ユーザーIDから名前を取得するヘルパー
function getUserName(userId) {
    const user = allData.users.find(u => u.id === userId);
    return user ? user.name : userId;
}

// --- 以下、アバター表示対応に修正 ---

function openSearch() { document.getElementById('search-modal').style.display = 'flex'; }
function closeSearch() { document.getElementById('search-modal').style.display = 'none'; }

async function searchUser() {
    const sid = document.getElementById('search-id-input').value;
    await loadData();
    const found = allData.users.find(u => u.id === sid);
    const resDiv = document.getElementById('search-result');
    if(found && found.id !== myUser.id) {
        // 【修正】検索結果にアバターを表示
        resDiv.innerHTML = `
            <img src="${getUserAvatar(found.id)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; margin-bottom:10px;"><br>
            ${found.name}さん発見！<br>
            <button class="btn-main" onclick="addFriend('${found.id}','${found.name}')">追加</button>
        `;
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
            <img class="chat-user-avatar" src="${getUserAvatar(f.id)}">
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
        // 【修正】初期登録時はデフォルトアバター
        user = {email, name, id, avatarData: DEFAULT_AVATAR};
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
    // 【修正】自分のアバターを表示
    document.getElementById('prof-avatar-img').src = getUserAvatar(myUser.id);

    const myPosts = allData.posts.filter(p => p.sender === myUser.id);
    document.getElementById('post-count').innerText = myPosts.length;
    document.getElementById('post-grid').innerHTML = myPosts.map(p => `
        <div class="ig-post-item">
            ${p.type==='video'?`<video src="${p.fileData}"></video>`:`<img src="${p.fileData}">`}
        </div>
    `).join('');
}

// 【追加】プロフィール画像をアップロードして保存する関数
async function updateProfileAvatar() {
    const file = document.getElementById('prof-avatar-input').files[0];
    if(!file) return;

    // 画像圧縮（GASの容量対策）
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const SIZE = 150; // 150x150にリサイズ
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            
            // 圧縮したBase64を取得
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 画質0.7

            // allDataを更新
            const userIndex = allData.users.findIndex(u => u.id === myUser.id);
            if(userIndex !== -1) {
                allData.users[userIndex].avatarData = compressedBase64;
                myUser = allData.users[userIndex]; // 自分の情報も更新
                localStorage.setItem('mizu_user', JSON.stringify(myUser));
                
                await saveData();
                alert("アバター変えたよ！");
                renderProfile(); // 再表示
            }
        };
    };
}

function renderTimeline() {
    const list = document.getElementById('timeline-list');
    if(!allData.posts || allData.posts.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">まだ投稿がないよ</p>';
        return;
    }
    list.innerHTML = allData.posts.map(p => `
        <div class="post-card">
            <div class="post-header">
                <img class="post-avatar" src="${getUserAvatar(p.sender)}">
                <div class="post-info">
                    <strong>${getUserName(p.sender)}</strong><br>
                    <span style="font-size:10px; color:#999;">@${p.sender}</span>
                </div>
            </div>
            ${p.type==='video'?`<video src="${p.fileData}" controls></video>`:`<img src="${p.fileData}">`}
            <div><strong>${p.title}</strong></div>
        </div>
    `).join('');
}

// 起動処理
(async () => {
    // 起動時にまずGASから最新データを読み込む（友達のアバターとかを表示するため）
    await loadData();
    if(myUser) {
        showScreen('screen-timeline');
    }
})();
