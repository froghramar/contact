import './ChatPrompt.css';

interface ChatPromptProps {
  onStartChat: () => void;
}

export default function ChatPrompt({ onStartChat }: ChatPromptProps) {
  return (
    <div className="chat-prompt">
      <div className="chat-prompt-content">
        <h2>Start a Conversation</h2>
        <p>Sign in to start chatting with us</p>
        <button onClick={onStartChat} className="btn-start-chat">
          Start Chat
        </button>
      </div>
    </div>
  );
}

