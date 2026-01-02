interface ChatPromptProps {
  onStartChat: () => void;
}

export default function ChatPrompt({ onStartChat }: ChatPromptProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm flex justify-center items-center min-h-[400px]">
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Start a Conversation</h2>
        <p className="text-gray-500 mb-8 text-base">Sign in to start chatting with us</p>
        <button 
          onClick={onStartChat} 
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-base font-semibold transition-colors duration-200"
        >
          Start Chat
        </button>
      </div>
    </div>
  );
}

