import rootScope from '@lib/rootScope';
import appImManager from '@lib/appImManager';
import {i18n} from '@lib/langPack';
import {attachClickEvent} from '@helpers/dom/clickEvent';
import Icon from '@components/icon';
import pause from '@helpers/schedulers/pause';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type GatheredContext = {
  peerName: string;
  messages: string;
}[];

async function gatherRecentMessages(limit = 5): Promise<GatheredContext> {
  const managers = rootScope.managers;
  const result: GatheredContext = [];

  const dialogElements = document.querySelectorAll<HTMLElement>('.chatlist-peer');

  for(const el of Array.from(dialogElements).slice(0, limit * 2)) {
    if(result.length >= limit) break;

    const peerIdStr = el.dataset.peerId;
    if(!peerIdStr) continue;

    const peerId = Number(peerIdStr) as any;
    if(!peerId || peerId === (rootScope.myId as any)) continue;

    try {
      const history = await managers.appMessagesManager.getHistory({
        peerId,
        limit: 20
      });

      if(!history?.messages?.length) continue;

      const peer = managers.appPeersManager.getPeer(peerId);
      const peerTitle = (peer as any)?.title || (peer as any)?.first_name || 'Unknown';
      const messageTexts: string[] = [];

      for(const msg of history.messages) {
        const message = (msg as any).message || '';
        if(typeof message === 'string' && message.trim()) {
          const date = new Date(((msg as any).date || 0) * 1000);
          const dateStr = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
          messageTexts.push(`[${dateStr}] ${message}`);
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
      content: `Chat with "${chat.peerName}":\n${chat.messages}`
    });
  }

  return messages;
}

async function queryMistral(query: string, context: GatheredContext): Promise<string> {
  const contextMessages = buildContextMessages(context);

  const contextText = contextMessages.map((m) => m.content).join('\n\n---\n\n');

  const fullQuery = `Based on these recent chats:\n\n${contextText}\n\nQuestion: ${query}`;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        messages: contextMessages,
        query: fullQuery
      })
    });

    const data = await response.json();

    if(data.error) {
      return `Error: ${data.error}`;
    }

    return data.reply || 'No response from AI.';
  } catch(e) {
    return `Connection error: ${(e as Error).message}`;
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
  inputEl.placeholder = 'Ask about your chats...';

  const sendBtn = document.createElement('button');
  sendBtn.classList.add('ai-assistant-send', 'btn-icon');
  sendBtn.textContent = '➤';

  inputArea.append(inputEl, sendBtn);
  container.append(header, messagesEl, inputArea);

  const messagesEl = container.querySelector('.ai-assistant-messages') as HTMLElement;
  const inputEl = container.querySelector('.ai-assistant-input') as HTMLInputElement;
  const sendBtn = container.querySelector('.ai-assistant-send') as HTMLElement;
  const closeBtn = container.querySelector('.ai-assistant-close') as HTMLElement;

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
      const context = await gatherRecentMessages(5);
      const reply = await queryMistral(query, context);
      typing.remove();
      addMessage(reply, 'assistant');
    } catch(e) {
      typing.remove();
      addMessage(`Error: ${(e as Error).message}`, 'assistant');
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

  addMessage('Hello! I can help you search through your Telegram chats. Ask me anything about your recent conversations.', 'assistant');

  return container;
}
