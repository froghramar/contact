import { formatDistanceToNow } from 'date-fns';
import { Message, Reaction } from '../types/database';
import EmojiPicker from 'emoji-picker-react';
import { useState } from 'react';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  reactions: Reaction[];
  onReaction: (messageId: string, emoji: string) => void;
  currentUserId: string;
}

export default function MessageItem({
  message,
  isOwn,
  reactions,
  onReaction,
  currentUserId,
}: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiObject: { emoji: string }) => {
    onReaction(message.id, emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className={`flex flex-col gap-2 relative ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`${isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'} px-4 py-3 rounded-2xl max-w-[70%] break-words`}>
        {!isOwn && (
          <div className={`text-xs font-semibold mb-1 ${isOwn ? 'text-white/80' : 'text-indigo-600'}`}>
            {message.sender?.email || 'Unknown'}
          </div>
        )}
        <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
        <div className="flex gap-2 items-center mt-2 text-xs opacity-70">
          <span>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {isOwn && message.seen_at && (
            <span className="italic">✓ Seen</span>
          )}
        </div>
      </div>

      <div className={`relative ${isOwn ? 'self-end' : 'self-start'}`}>
        <button
          className="bg-white border border-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add reaction"
        >
          😊
        </button>
        {showEmojiPicker && (
          <div className={`absolute bottom-full ${isOwn ? 'right-0' : 'left-0'} mb-2 z-[1000]`}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
            />
          </div>
        )}
      </div>

      {Object.keys(reactionGroups).length > 0 && (
        <div className={`flex gap-2 flex-wrap mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(reactionGroups).map(([emoji, reactionList]) => {
            const hasUserReaction = reactionList.some((r) => r.user_id === currentUserId);
            return (
              <button
                key={emoji}
                className={`flex items-center gap-1 bg-white border px-2 py-1 rounded-full text-xs transition-all duration-200 hover:bg-gray-50 hover:border-indigo-600 ${
                  hasUserReaction ? 'bg-indigo-50 border-indigo-600' : 'border-gray-200'
                }`}
                onClick={() => onReaction(message.id, emoji)}
                title={`${reactionList.length} reaction${reactionList.length > 1 ? 's' : ''}`}
              >
                <span className="text-base">{emoji}</span>
                <span className="font-semibold text-slate-800">{reactionList.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

