import rootScope from '@lib/rootScope';
import appImManager from '@lib/appImManager';
import {attachClickEvent} from '@helpers/dom/clickEvent';
import {getIconContent} from '@components/icon';
import appDialogsManager from '@lib/appDialogsManager';
import apiManagerProxy from '@lib/apiManagerProxy';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type GatheredContext = {
  peerName: string;
  messages: string;
}[];

function getTopDialogPeerIds(limit = 8): PeerId[] {
  const peerIds: PeerId[] = [];
  const elements = document.querySelectorAll<HTMLElement>('[data-peer-id]');
  const seen = new Set<string>();

  for(const el of Array.from(elements)) {
    if(peerIds.length >= limit) break;

    const peerIdStr = el.dataset.peerId;
    if(!peerIdStr || seen.has(peerIdStr)) continue;

    const peerId = Number(peerIdStr);
    if(!peerId || peerId === (rootScope.myId as any)) continue;

    seen.add(peerIdStr);
    peerIds.push(peerId as PeerId);
  }

  return peerIds;
}

async function gatherRecentMessages(limit = 8): Promise<GatheredContext> {
  const managers = rootScope.managers;
  const result: GatheredContext = [];
  const peerIds = getTopDialogPeerIds(limit);

  for(const peerId of peerIds) {
    try {
      const history = await managers.appMessagesManager.getHistory({
        peerId,
        limit: 30
      });

      if(!history?.history?.length) continue;

      const peer = managers.appPeersManager.getPeer(peerId);
      let peerTitle = 'Unknown';
      if((peer as any)?.title) peerTitle = (peer as any).title;
      else if((peer as any)?.first_name) {
        peerTitle = (peer as any).first_name;
        if((peer as any)?.last_name) peerTitle += ' ' + (peer as any).last_name;
      }

      const messageTexts: string[] = [];

      for(const msg of history.history) {
        const m = msg as any;
        const text = m.message || m.messageText || '';
        if(typeof text === 'string' && text.trim()) {
          const date = new Date((m.date || 0) * 1000);
          const dateStr = date.toLocaleDateString('uz-UZ', {month: 'short', day: 'numeric'});
          const sender = m.fromId === rootScope.myId ? 'Men' : peerTitle;
          messageTexts.push(`[${dateStr}] ${sender}: ${text}`);
        }
      }

      if(messageTexts.length) {
        result.push({
          peerName: peerTitle,
          messages: messageTexts.join('\n')
        });
      }
    } catch(e) {
      continue;
    }
  }

  return result;
}

function buildContextMessages(context: GatheredContext): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for(const chat of context) {
    messages.push({
      role: 'user' as const,
      content: `Chat "${chat.peerName}" xabarlari:\n${chat.messages}`
    });
  }

  return messages;
}

async function queryMistral(query: string, context: GatheredContext): Promise<string> {
  const contextMessages = buildContextMessages(context);

  let contextText = '';
  for(const chat of context) {
    contextText += `\n--- ${chat.peerName} ---\n${chat.messages}\n`;
  }

  const fullQuery = `Sizga foydalanuvchining Telegram chatlari berilgan. Quyidagi xabarlarni tahlil qiling va savolga javob bering.\n\nChatlar:${contextText}\n\nSavol: ${query}`;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        messages: contextMessages,
        query: fullQuery
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return `API xatosi: Server noto'g'ri javob qaytardi. Status: ${response.status}`;
    }

    if(data.error) {
      return `Xato: ${data.error}`;
    }

    return data.reply || 'Javob olinmadi.';
  } catch(e) {
    return `Ulanish xatosi: ${(e as Error).message}. Server ishlamayapti yoki /api/ai endpoint topilmadi.`;
  }
}

export function createAIAssistantPanel() {
  const container = document.createElement('div');
  container.classList.add('ai-assistant-panel');

  const header = document.createElement('div');
  header.classList.add('ai-assistant-header');

  const headerTexts = document.createElement('div');
  headerTexts.classList.add('ai-assistant-header-texts');

  const title = document.createElement('span');
  title.classList.add('ai-assistant-title');
  title.textContent = 'AI Assistant';

  const subtitle = document.createElement('span');
  subtitle.classList.add('ai-assistant-subtitle');
  subtitle.textContent = 'Loopinuz AI powered by Mistral';

  headerTexts.append(title, subtitle);

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('ai-assistant-close', 'btn-icon');
  closeBtn.textContent = '✕';

  header.append(headerTexts, closeBtn);

  const messagesEl = document.createElement('div');
  messagesEl.classList.add('ai-assistant-messages');

  const inputArea = document.createElement('div');
  inputArea.classList.add('ai-assistant-input-area');

  const inputEl = document.createElement('input');
  inputEl.classList.add('ai-assistant-input');
  inputEl.type = 'text';
  inputEl.placeholder = 'Chatlaringiz haqida biror narsa so\'rang...';

  const sendBtn = document.createElement('button');
  sendBtn.classList.add('ai-assistant-send', 'btn-icon');
  sendBtn.textContent = '➤';

  inputArea.append(inputEl, sendBtn);
  container.append(header, messagesEl, inputArea);

  function addMessage(text: string, role: 'user' | 'assistant') {
    const msg = document.createElement('div');
    msg.classList.add('ai-assistant-message', `ai-msg-${role}`);
    msg.textContent = text;
    messagesEl.append(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTypingIndicator() {
    const typing = document.createElement('div');
    typing.classList.add('ai-assistant-message', 'ai-msg-assistant', 'ai-typing');
    typing.innerHTML = '<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>';
    messagesEl.append(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return typing;
  }

  async function handleSend() {
    const query = inputEl.value.trim();
    if(!query) return;

    addMessage(query, 'user');
    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.style.pointerEvents = 'none';

    const typing = addTypingIndicator();

    try {
      addMessage('Chatlaringizdan xabarlar yig\'ilmoqda...', 'assistant');

      const context = await gatherRecentMessages(8);

      if(!context.length) {
        typing.remove();
        addMessage('Chatlaringizdan xabarlar topilmadi. Iltimos, avval birorta chatni oching va xabarlar yuklanishini kuting.', 'assistant');
      } else {
        typing.remove();
        const chatNames = context.map((c) => c.peerName).join(', ');
        addMessage(`${context.length} ta chat topildi: ${chatNames}. So'rov yuborilmoqda...`, 'assistant');

        const reply = await queryMistral(query, context);
        addMessage(reply, 'assistant');
      }
    } catch(e) {
      typing.remove();
      addMessage(`Xato: ${(e as Error).message}`, 'assistant');
    } finally {
      inputEl.disabled = false;
      sendBtn.style.pointerEvents = '';
      inputEl.focus();
    }
  }

  attachClickEvent(sendBtn, handleSend);
  attachClickEvent(closeBtn, () => {
    container.remove();
  });

  inputEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  addMessage('Salom! Men sizning Telegram chatlaringizni tahlil qila olaman.\n\nQuyidagi tugmalardan birini bosing yoki o\'zingiz savol yozing:', 'assistant');

  const prompts = [
    {text: 'Kim menga oxirgi xabar yozdi?', icon: '💬'},
    {text: 'Akam bilan oxirgi 10 ta xabarni ko\'rsat', icon: '👨‍👦'},
    {text: 'Do\'stlarim bilan nima haqida gaplashdik?', icon: '👥'}
  ];

  const promptsContainer = document.createElement('div');
  promptsContainer.classList.add('ai-prompts-container');

  for(const prompt of prompts) {
    const btn = document.createElement('button');
    btn.classList.add('ai-prompt-btn');
    btn.textContent = `${prompt.icon} ${prompt.text}`;
    attachClickEvent(btn, () => {
      inputEl.value = prompt.text;
      handleSend();
    });
    promptsContainer.append(btn);
  }

  messagesEl.append(promptsContainer);

  return container;
}
