// Google Apps Script (GAS) コード
// このスクリプトをGoogle Apps Scriptエディタに貼り付けてデプロイしてください。
// デプロイURLをHTMLのAPI_URLに設定してください。

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  }

  switch (action) {
    case 'createUser':
      const users = getUsers();
      if (users.find(u => u.id === data.id)) {
        return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
      }
      users.push({ id: data.id, name: '' });
      saveUsers(users);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

    case 'updateUser':
      const users2 = getUsers();
      const index = users2.findIndex(u => u.id === data.user.id);
      if (index !== -1) {
        users2[index] = data.user;
        saveUsers(users2);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

    case 'createPost':
      const posts = getPosts();
      posts.push({
        id: new Date().getTime(),
        userId: data.userId,
        title: data.title,
        media: data.media || '',
        timestamp: new Date().toISOString()
      });
      savePosts(posts);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

    case 'sendMessage':
      const messages = getMessages();
      messages.push({
        id: new Date().getTime(),
        from: data.from,
        to: data.to,
        text: data.text,
        media: data.media || '',
        timestamp: new Date().toISOString()
      });
      saveMessages(messages);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

    case 'editMessage':
      const messages2 = getMessages();
      const msgIndex = messages2.findIndex(m => m.id == data.id);
      if (msgIndex !== -1) {
        messages2[msgIndex].text = data.text;
        saveMessages(messages2);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

    default:
      return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  switch (action) {
    case 'searchUsers':
      const query = e.parameter.query;
      const users = getUsers().filter(u => u.id.includes(query) || (u.name && u.name.includes(query)));
      return ContentService.createTextOutput(JSON.stringify(users)).setMimeType(ContentService.MimeType.JSON);

    case 'getPosts':
      const posts = getPosts();
      return ContentService.createTextOutput(JSON.stringify(posts)).setMimeType(ContentService.MimeType.JSON);

    case 'getChats':
      const userId = e.parameter.userId;
      const messages = getMessages();
      const chatUsers = new Set();
      messages.forEach(msg => {
        if (msg.from === userId) chatUsers.add(msg.to);
        if (msg.to === userId) chatUsers.add(msg.from);
      });
      const chats = Array.from(chatUsers).map(id => getUsers().find(u => u.id === id)).filter(u => u);
      return ContentService.createTextOutput(JSON.stringify(chats)).setMimeType(ContentService.MimeType.JSON);

    case 'getMessages':
      const from = e.parameter.from;
      const to = e.parameter.to;
      const filteredMessages = getMessages().filter(msg =>
        (msg.from === from && msg.to === to) || (msg.from === to && msg.to === from)
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return ContentService.createTextOutput(JSON.stringify(filteredMessages)).setMimeType(ContentService.MimeType.JSON);

    case 'getUserPosts':
      const userId2 = e.parameter.userId;
      const userPosts = getPosts().filter(p => p.userId === userId2);
      return ContentService.createTextOutput(JSON.stringify(userPosts)).setMimeType(ContentService.MimeType.JSON);

    default:
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function getUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({ id: row[0], name: row[1] || '' }));
}

function saveUsers(users) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return;
  sheet.clear();
  sheet.appendRow(['ID', 'Name']);
  users.forEach(u => sheet.appendRow([u.id, u.name]));
}

function getPosts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0],
    userId: row[1],
    title: row[2],
    media: row[3] || '',
    timestamp: row[4]
  }));
}

function savePosts(posts) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
  if (!sheet) return;
  sheet.clear();
  sheet.appendRow(['ID', 'UserID', 'Title', 'Media', 'Timestamp']);
  posts.forEach(p => sheet.appendRow([p.id, p.userId, p.title, p.media, p.timestamp]));
}

function getMessages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Messages');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0],
    from: row[1],
    to: row[2],
    text: row[3],
    media: row[4] || '',
    timestamp: row[5]
  }));
}

function saveMessages(messages) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Messages');
  if (!sheet) return;
  sheet.clear();
  sheet.appendRow(['ID', 'From', 'To', 'Text', 'Media', 'Timestamp']);
  messages.forEach(m => sheet.appendRow([m.id, m.from, m.to, m.text, m.media, m.timestamp]));
}