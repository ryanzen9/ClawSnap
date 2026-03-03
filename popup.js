const botTokenInput = document.getElementById('botToken');
const chatIdInput = document.getElementById('chatId');
const noteInput = document.getElementById('note');
const clawMentionInput = document.getElementById('clawMention');
const templatePresetEl = document.getElementById('templatePreset');
const analysisTemplateEl = document.getElementById('analysisTemplate');
const saveBtn = document.getElementById('saveBtn');
const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');

const PRESET_TEMPLATES = {
  summary: [
    '请基于以下页面信息进行总结：',
    '- 时间：{{timestamp}}',
    '- 站点：{{domain}}',
    '- 标题：{{title}}',
    '- URL：{{url}}',
    '- 备注：{{note}}',
    '',
    '页面摘要：',
    '{{snippet}}',
    '',
    '输出要求：',
    '1) 3-5条核心要点',
    '2) 一句话结论',
    '3) 如有不确定信息请标注'
  ].join('\n'),
  todo: [
    '请基于以下页面信息提取可执行待办：',
    '- 时间：{{timestamp}}',
    '- 站点：{{domain}}',
    '- 标题：{{title}}',
    '- URL：{{url}}',
    '- 备注：{{note}}',
    '',
    '页面摘要：',
    '{{snippet}}',
    '',
    '输出要求：',
    '1) 按优先级列出待办（高/中/低）',
    '2) 每条待办包含：动作、预期结果、截止建议',
    '3) 补充“下一步最小行动”'
  ].join('\n'),
  risk: [
    '请基于以下页面信息做风险评估：',
    '- 时间：{{timestamp}}',
    '- 站点：{{domain}}',
    '- 标题：{{title}}',
    '- URL：{{url}}',
    '- 备注：{{note}}',
    '',
    '页面摘要：',
    '{{snippet}}',
    '',
    '输出要求：',
    '1) 识别主要风险点（事实/合规/执行/技术）',
    '2) 给出每个风险的影响与概率（高/中/低）',
    '3) 提出可落地的缓解措施'
  ].join('\n')
};

function setStatus(msg, isError = false) {
  statusEl.classList.remove('ok', 'error');
  statusEl.classList.add(isError ? 'error' : 'ok');
  statusEl.textContent = msg;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getDomain(url) {
  try {
    return new URL(url).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

function formatTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function applyTemplate(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(vars[key] ?? ''));
}

async function loadConfig() {
  const cfg = await chrome.storage.local.get([
    'botToken',
    'chatId',
    'analysisTemplate',
    'templatePreset',
    'clawMention'
  ]);

  botTokenInput.value = cfg.botToken || '';
  chatIdInput.value = cfg.chatId || '';

  const preset = cfg.templatePreset || 'summary';
  clawMentionInput.value = cfg.clawMention || '';
  templatePresetEl.value = preset;

  if (cfg.analysisTemplate) {
    analysisTemplateEl.value = cfg.analysisTemplate;
  } else {
    analysisTemplateEl.value = PRESET_TEMPLATES[preset] || PRESET_TEMPLATES.summary;
  }
}

async function saveConfig() {
  const botToken = botTokenInput.value.trim();
  const chatId = chatIdInput.value.trim();
  const templatePreset = templatePresetEl.value;
  const analysisTemplate = analysisTemplateEl.value.trim();
  const clawMention = clawMentionInput.value.trim();

  if (!botToken || !chatId) {
    setStatus('请先填写 Bot Token 和 Chat ID', true);
    return;
  }
  if (!analysisTemplate) {
    setStatus('分析模板不能为空', true);
    return;
  }

  await chrome.storage.local.set({ botToken, chatId, analysisTemplate, templatePreset, clawMention });
  setStatus('配置已保存');
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) throw new Error('未找到活动标签页');
  return tabs[0];
}

async function extractPageSummary(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const title = document.title || '';
      const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      return { title, textSnippet: text.slice(0, 1500) };
    }
  });
  return result;
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function buildPhotoCaption({ timestamp, domain, url, title, note }) {
  const tags = [`#capture`, `#${domain.replace(/[^a-zA-Z0-9_]/g, '_')}`];
  const lines = [
    '📌 <b>浏览器捕获</b>',
    `<b>时间:</b> ${escapeHtml(timestamp)}`,
    `<b>站点:</b> ${escapeHtml(domain)}`,
    title ? `<b>标题:</b> ${escapeHtml(title)}` : '',
    url ? `<b>URL:</b> ${escapeHtml(url)}` : '',
    note ? `<b>备注:</b> ${escapeHtml(note)}` : '',
    '',
    tags.join(' ')
  ].filter(Boolean);

  let caption = lines.join('\n');
  if (caption.length > 1000) caption = caption.slice(0, 1000) + '…';
  return caption;
}

async function telegramSendPhoto({ botToken, chatId, imageBlob, caption }) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('photo', imageBlob, 'capture.png');
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: form
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) throw new Error(`发送截图失败: ${data.description || resp.statusText}`);
}

async function telegramSendMessage({ botToken, chatId, text }) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) throw new Error(`发送分析指令失败: ${data.description || resp.statusText}`);
}

async function captureAndSend() {
  try {
    sendBtn.disabled = true;
    setStatus('正在捕获页面...');

    const { botToken, chatId, analysisTemplate, clawMention } = await chrome.storage.local.get([
      'botToken',
      'chatId',
      'analysisTemplate',
      'clawMention'
    ]);

    if (!botToken || !chatId) throw new Error('请先保存 Bot Token 和 Chat ID');
    if (!analysisTemplate) throw new Error('请先配置并保存分析模板');

    const tab = await getActiveTab();
    const page = await extractPageSummary(tab.id);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const imageBlob = dataUrlToBlob(dataUrl);

    const url = tab.url || '';
    const title = page?.title || tab.title || '';
    const snippet = page?.textSnippet || '';
    const domain = getDomain(url);
    const timestamp = formatTimestamp();
    const note = noteInput.value.trim();

    const photoCaption = buildPhotoCaption({ timestamp, domain, url, title, note });
    const analysisText = applyTemplate(analysisTemplate, {
      timestamp,
      domain,
      url,
      title,
      note,
      snippet
    });

    setStatus('正在发送截图...');
    await telegramSendPhoto({ botToken, chatId, imageBlob, caption: photoCaption });

    const mentionPrefix = (clawMention || '').trim();
    const finalText = mentionPrefix ? `${mentionPrefix}\n🧠 分析请求\n\n${analysisText}` : `🧠 分析请求\n\n${analysisText}`;

    setStatus('正在发送分析指令...');
    await telegramSendMessage({ botToken, chatId, text: finalText });

    setStatus('发送成功 ✅');
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    sendBtn.disabled = false;
  }
}

templatePresetEl.addEventListener('change', () => {
  const preset = templatePresetEl.value;
  if (preset !== 'custom' && PRESET_TEMPLATES[preset]) {
    analysisTemplateEl.value = PRESET_TEMPLATES[preset];
  }
});

saveBtn.addEventListener('click', saveConfig);
sendBtn.addEventListener('click', captureAndSend);
loadConfig();
