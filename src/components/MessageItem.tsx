import { formatDistanceToNow } from 'date-fns';
import { Message, Reaction } from '../types/database';
import EmojiPicker from 'emoji-picker-react';
import { useState } from 'react';
import './MessageItem.css';

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
    <div className={`message-item ${isOwn ? 'message-own' : ''}`}>
      <div className="message-content">
        {!isOwn && (
          <div className="message-sender">{message.sender?.email || 'Unknown'}</div>
        )}
        <div className="message-text">{message.content}</div>
        <div className="message-footer">
          <span className="message-time">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {isOwn && message.seen_at && (
            <span className="message-seen">✓ Seen</span>
          )}
        </div>
      </div>

      <div className="message-actions">
        <button
          className="btn-emoji"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add reaction"
        >
          😊
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
            />
          </div>
        )}
      </div>

      {Object.keys(reactionGroups).length > 0 && (
        <div className="message-reactions">
          {Object.entries(reactionGroups).map(([emoji, reactionList]) => {
            const hasUserReaction = reactionList.some((r) => r.user_id === currentUserId);
            return (
              <button
                key={emoji}
                className={`reaction-badge ${hasUserReaction ? 'reaction-active' : ''}`}
                onClick={() => onReaction(message.id, emoji)}
                title={`${reactionList.length} reaction${reactionList.length > 1 ? 's' : ''}`}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{reactionList.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

