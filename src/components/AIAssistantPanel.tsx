import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Bot, Loader, ShieldAlert } from 'lucide-react';
import { useAIAssistant } from '../hooks/useAIAssistant';
import type { ChatMessage, PendingCreation } from '../hooks/useAIAssistant';
import type { Task, ProjectList } from '../models/types';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeListId: string;
  projectLists: ProjectList[];
  tasks: Task[];
  onCreateEntry: (creation: PendingCreation) => void;
}

const CONSENT_KEY = 'ai_consent_given';

const QUICK_ACTIONS = [
  { label: 'Generate to-do list', prompt: 'Generate a to-do list for my current project based on the workspace context.' },
  { label: 'Generate a prompt', prompt: 'Generate a reusable prompt template based on my current project context.' },
];

function buildContext(activeListId: string, projectLists: ProjectList[], tasks: Task[]): string {
  const activeProject = projectLists.find(p => p.id === activeListId);
  const viewName =
    activeListId === 'hub' ? 'Dashboard' :
    activeListId === 'todo' ? 'Quick to-do list' :
    activeListId === 'calendar' ? 'Calendar' :
    activeListId === 'important' ? 'Favorites' :
    activeProject?.name ?? activeListId;

  const relevantTasks = activeListId === 'hub' || activeListId === 'important' || activeListId === 'calendar'
    ? tasks
    : tasks.filter(t => t.listId === activeListId || (activeListId === 'todo' && t.listId === 'todo'));

  const done = relevantTasks.filter(t => t.completed).length;
  const total = relevantTasks.length;

  let context = `Active view: ${viewName}\nTasks: ${total} total, ${done} completed, ${total - done} pending`;

  if (relevantTasks.length > 0 && relevantTasks.length <= 20) {
    const pendingList = relevantTasks
      .filter(t => !t.completed)
      .map(t => `- ${t.text}${t.title ? ` (${t.title})` : ''}`)
      .join('\n');
    if (pendingList) context += `\n\nPending tasks:\n${pendingList}`;
  }

  return context;
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const lines = msg.content.split('\n');
  return (
    <div className={`ai-message ${isUser ? 'ai-message--user' : 'ai-message--assistant'}`}>
      {!isUser && (
        <div className="ai-message-avatar">
          <Bot size={14} aria-hidden="true" />
        </div>
      )}
      <div className="ai-message-bubble">
        {lines.map((line, i) => (
          <p key={i} className="ai-message-line">{line || '\u00A0'}</p>
        ))}
      </div>
    </div>
  );
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  activeListId,
  projectLists,
  tasks,
  onCreateEntry,
}) => {
  const [input, setInput] = useState('');
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === 'true');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, error, pendingCreation, clearPendingCreation, sendMessage, clearHistory } = useAIAssistant();

  const contextInfo = buildContext(activeListId, projectLists, tasks);

  const giveConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsent(true);
  };

  // Fire creation into the app as soon as the AI returns one
  useEffect(() => {
    if (!pendingCreation) return;
    onCreateEntry(pendingCreation);
    clearPendingCreation();
  }, [pendingCreation]);

  useEffect(() => {
    if (isOpen && hasConsent && inputRef.current) inputRef.current.focus();
  }, [isOpen, hasConsent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text, contextInfo);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt, contextInfo);
  };

  return (
    <div className={`ai-panel${isOpen ? ' ai-panel--open' : ''}`} role="complementary" aria-label="AI Assistant">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Bot size={16} aria-hidden="true" />
          <span>AI Assistant</span>
        </div>
        <div className="ai-panel-actions">
          {hasConsent && messages.length > 0 && (
            <button className="ai-icon-btn" onClick={clearHistory} title="Clear conversation" aria-label="Clear conversation">
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
          <button className="ai-icon-btn" onClick={onClose} title="Close" aria-label="Close AI Assistant">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!hasConsent ? (
        /* Consent gate */
        <div className="ai-consent-gate">
          <ShieldAlert size={32} aria-hidden="true" />
          <h3>Data sharing notice</h3>
          <p>
            The AI Assistant sends your task names and project context to{' '}
            <strong>Groq's API</strong> to generate responses. This data leaves
            your device and is processed by Groq's servers.
          </p>
          <p>
            Do not include passwords, personal identification numbers, or other
            sensitive information in your tasks if you use this feature.
          </p>
          <div className="ai-consent-actions">
            <button className="ai-consent-accept" onClick={giveConsent}>
              I understand, enable AI
            </button>
            <button className="ai-consent-decline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="ai-quick-actions">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                className="ai-quick-btn"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="ai-messages" role="log" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && !error && (
              <div className="ai-empty-state">
                <Bot size={32} aria-hidden="true" />
                <p>I can generate a to-do list or a prompt for you. Use the buttons above or describe what you need.</p>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {isLoading && (
              <div className="ai-message ai-message--assistant" aria-label="AI is thinking">
                <div className="ai-message-avatar">
                  <Bot size={14} aria-hidden="true" />
                </div>
                <div className="ai-message-bubble ai-typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {error && <div className="ai-error" role="alert">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-input-area">
            <div className="ai-input-wrapper">
              <input
                ref={inputRef}
                className="ai-input"
                type="text"
                placeholder="Describe a to-do list or prompt to generate..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                maxLength={500}
                aria-label="Message to AI assistant"
              />
              <button
                className="ai-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                title="Send"
                aria-label="Send message"
              >
                {isLoading ? <Loader size={16} className="ai-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantPanel;
