import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Reaction } from '../types/database';
import MessageItem from './MessageItem';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  threadId: string;
}

export default function MessageList({ messages, currentUserId, threadId }: MessageListProps) {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  useEffect(() => {
    loadReactions();
  }, [messages]);

  const loadReactions = async () => {
    if (messages.length === 0) return;

    const messageIds = messages.map((m) => m.id);
    const { data } = await supabase
      .from('reactions')
      .select('*')
      .in('message_id', messageIds);

    if (data) {
      const reactionsMap: Record<string, Reaction[]> = {};
      data.forEach((reaction) => {
        if (!reactionsMap[reaction.message_id]) {
          reactionsMap[reaction.message_id] = [];
        }
        reactionsMap[reaction.message_id].push(reaction);
      });
      setReactions(reactionsMap);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // Check if user already reacted with this emoji
    const existing = reactions[messageId]?.find(
      (r) => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji
    );

    if (existing) {
      // Remove reaction
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      // Add reaction
      await supabase.from('reactions').insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });
    }

    loadReactions();
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.sender_id === currentUserId}
          reactions={reactions[message.id] || []}
          onReaction={handleReaction}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

