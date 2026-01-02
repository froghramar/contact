import { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 px-4 py-4 border-t border-gray-200 bg-white rounded-b-xl">
      <textarea
        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-base resize-none overflow-y-auto focus:outline-none focus:border-indigo-600 transition-colors duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
        rows={1}
        style={{
          height: 'auto',
          minHeight: '40px',
          maxHeight: '120px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }}
      />
      <button 
        onClick={handleSend} 
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-base font-semibold transition-colors duration-200 self-end disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!message.trim()}
      >
        Send
      </button>
    </div>
  );
}

