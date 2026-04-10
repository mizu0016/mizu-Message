window.onload = function() {
    const name = localStorage.getItem('userName');
    const icon = localStorage.getItem('userIcon');
    const bio = localStorage.getItem('userBio') || "";
    
    if (!name) { window.location.href = "1.html"; return; }

    document.getElementById('welcome-message').innerText = name;
    document.getElementById('my-icon-display').src = icon;
    document.getElementById('profile-preview').src = icon;
    document.getElementById('profile-bio').value = bio;
};

function showProfile() { hideAll(); document.getElementById('profile-section').style.display = 'flex'; }
function showSearch() { hideAll(); document.getElementById('search-section').style.display = 'flex'; }
function hideAll() {
    document.getElementById('profile-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
}

function saveProfile() {
    const newIcon = document.getElementById('profile-img-url').value;
    const newBio = document.getElementById('profile-bio').value;
    if(newIcon) {
        localStorage.setItem('userIcon', newIcon);
        document.getElementById('my-icon-display').src = newIcon;
    }
    localStorage.setItem('userBio', newBio);
    alert("保存しました！");
    showSearch();
}

let currentPartner = "";
function startChat() {
    const id = document.getElementById('search-id-input').value;
    if (!id) return;
    currentPartner = id;
    hideAll();
    document.getElementById('chat-section').style.display = 'flex';
    document.getElementById('chat-partner-name').innerText = id + " とのチャット";
}

function sendMessage() {
    const text = document.getElementById('m-text').value;
    if (!text) return;
    const chatArea = document.getElementById('chat-area');
    const msg = document.createElement('div');
    msg.className = "message my";
    msg.innerText = text;
    chatArea.appendChild(msg);

    const s_url = "https://script.google.com/macros/s/AKfycbxLg7kmU6KUT47RRfJgwFrKB2iEVwxYfc8PTlLB4XMQviIC1lDY6Y3KN2hErFbrBjStWg/exec";
    fetch(`${s_url}?id=${localStorage.getItem('myId')}&name=${encodeURIComponent(localStorage.getItem('userName'))}&partner=${encodeURIComponent(currentPartner)}&message=${encodeURIComponent(text)}`, { mode: 'no-cors' });

    document.getElementById('m-text').value = "";
    chatArea.scrollTop = chatArea.scrollHeight;
}
