export function getWebview(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Coding Assistant</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">
<style>
  body { margin:0; font-family: var(--vscode-font-family); background:#1e1e1e; color:#ddd; display:flex; flex-direction:column; height:100vh; }
  
  #chat { flex:1; overflow-y:auto; padding:16px; display: flex; flex-direction: column; gap: 16px; }
  
  .msg { 
    position:relative; 
    padding: 12px 48px 12px 14px; 
    border-radius:8px; 
    line-height:1.6; 
    max-width: 75%; 
    word-break: break-word; 
    box-sizing: border-box; 
    min-height: 42px; /* Ensures a clean default height when loading */
  }
  
  .msg.user { background:#2a2d2e; align-self: flex-end; border: 1px solid #3e4244; }
  .msg.bot  { background:#252526; border:1px solid #333; align-self: flex-start; }
  
  /* FIX: Hide the copy button entirely when the message wrapper is flagged as empty */
  .msg.is-empty .copy-btn { display: none !important; }
  
  .msg pre { background:#0d1117; padding:12px; border-radius:6px; overflow-x:auto; margin: 8px 0; }
  .msg code { font-family: var(--vscode-editor-font-family, monospace); }
  
  .copy-btn {
    position:absolute; 
    top: 8px; 
    right: 8px;
    background: rgba(255, 255, 255, 0.04); 
    color: #888;
    border: 1px solid #444; 
    border-radius: 4px;
    padding: 4px 6px; 
    font-size: 11px; 
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .copy-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: #666; }
  
  #inputBar { display:flex; gap:6px; padding:8px; border-top:1px solid #333; background:#252526; }
  #prompt { flex:1; padding:8px; background:#1e1e1e; color:#ddd; border:1px solid #444; border-radius:6px; resize:none; min-height:38px; max-height:120px; }
  button.action { background:#0e639c; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; }
  button.action:hover { background:#1177bb; }
  #fileBtn { background:transparent; color:#ddd; border:1px solid #444; padding:6px 10px; border-radius:6px; cursor:pointer; }
  #fileName { font-size:11px; color:#888; padding:4px 8px; }
</style>
</head>
<body>
  <div id="chat"></div>
  <div id="fileName"></div>
  <div id="inputBar">
    <input type="file" id="fileInput" style="display:none" accept=".txt,.md,.pdf"/>
    <button id="fileBtn" title="Attach file">📎</button>
    <textarea id="prompt" placeholder="Ask anything..."></textarea>
    <button class="action" id="sendBtn">Send</button>
    <button class="action" id="newBtn">New</button>
    <button class="action" id="themeBtn">🌙</button>
   <button class="action" id="forkBtn">Fork</button>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  let darkMode = true;
  const chatEl = document.getElementById('chat');
  const promptEl = document.getElementById('prompt');
  const fileInput = document.getElementById('fileInput');
  const fileNameEl = document.getElementById('fileName');
  let attachedFile = null;

  let currentBotBody = null;
  let currentBotText = "";
  let currentBotCopyBtn = null;

  function renderMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    
    // Add an initial empty state flag if there is no text content yet
    if (!text || !text.trim()) {
      wrap.classList.add('is-empty');
    }

    const body = document.createElement('div');
    body.className = 'msg-body';
    body.innerHTML = (role === 'bot') ? marked.parse(text || '') : escapeHtml(text || '');

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy text';

    
    let targetText = text;
    copyBtn.onclick = async () => {
      try {
        const textToCopy = (role === 'bot' && wrap.dataset.fullText) ? wrap.dataset.fullText : targetText;
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.textContent = '✅';
        setTimeout(() => copyBtn.textContent = '📋', 1200);
      } catch (e) { copyBtn.textContent = '❌'; }
    };

    wrap.appendChild(copyBtn);
    wrap.appendChild(body);
    chatEl.appendChild(wrap);
    chatEl.scrollTop = chatEl.scrollHeight;

    return { wrap, body, copyBtn };
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.getElementById('sendBtn').onclick = send;
  document.getElementById('newBtn').onclick = () => vscode.postMessage({ type: 'newChat' });
  document.getElementById('forkBtn').onclick = () => vscode.postMessage({ type: 'forkChat' });
  document.getElementById('fileBtn').onclick = () => fileInput.click();

  promptEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        promptEl.focus();     // ctrl+k=>focus
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        vscode.postMessage({ type: "newChat" });                // CTRL+l=>new chart
    }
  });

  document.getElementById("themeBtn").onclick = () => {
    if (darkMode) {
        document.body.style.background = "#FDF6E3";
        document.body.style.color = "#FFFFFF";
        darkMode = false;
        document.getElementById("themeBtn").textContent = "☀";
    } else {
        document.body.style.background = "#1E1E1E";
        document.body.style.color = "#DDDDDD";
        darkMode = true;
        document.getElementById("themeBtn").textContent = "🌙";
    }
  };

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    attachedFile = { name: f.name, base64: btoa(bin) };
    fileNameEl.textContent = ' ' + f.name;
  });

  function send() {
    const text = promptEl.value.trim();
    if (!text && !attachedFile) return;
    renderMessage('user', text);
    vscode.postMessage({ type: 'user', text, file: attachedFile });
    promptEl.value = '';
    attachedFile = null;
    fileNameEl.textContent = '';
  }

  window.addEventListener('message', e => {
    const m = e.data;
    
    if (m.type === 'startBotResponse') {
      currentBotText = "";
      const elements = renderMessage('bot', '');
      currentBotBody = elements.body;
      currentBotCopyBtn = elements.wrap; 
      return;
    }

    if (m.type === 'botChunk') {
      if (currentBotBody) {
        currentBotText += m.text;
        
        // Remove the empty state flag once content streams in
        if (currentBotText.trim() && currentBotCopyBtn.classList.contains('is-empty')) {
          currentBotCopyBtn.classList.remove('is-empty');
        }
        
        currentBotBody.innerHTML = marked.parse(currentBotText || '');
        if (currentBotCopyBtn) {
          currentBotCopyBtn.dataset.fullText = currentBotText; 
        }
        chatEl.scrollTop = chatEl.scrollHeight;
      }
      return;
    }

    if (m.type === 'bot') {
      if (currentBotCopyBtn) {
        currentBotCopyBtn.classList.remove('is-empty');
      }
      if (currentBotBody) {
        currentBotText = m.text;
        currentBotBody.innerHTML = marked.parse(m.text || '');
        currentBotCopyBtn.dataset.fullText = m.text;
        currentBotBody = null; 
      } else {
        renderMessage('bot', m.text);
      }
    }

    if (m.type === 'chatCleared') {
      chatEl.innerHTML = '';
      currentBotBody = null;
    }

    if (m.type === 'loadHistory') {
      chatEl.innerHTML = '';
      currentBotBody = null;
      for (const msg of (m.history || [])) {
        const t = msg.parts?.[0]?.text;
        if (!t) continue;
        renderMessage(msg.role === 'user' ? 'user' : 'bot', t);
      }
    }
  });
</script>
</body>
</html>`;
}
