import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/database';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface AdminChatInterfaceProps {
  threadId: string;
  userId: string;
}

export default function AdminChatInterface({ threadId, userId }: AdminChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;

    loadMessages();
    
    const messagesChannel = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`reactions:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:user_profiles!messages_sender_id_fkey(email)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const transformedMessages = data.map((msg: any) => ({
      ...msg,
      sender: msg.sender ? { email: msg.sender.email } : undefined,
    }));

    setMessages(transformedMessages);

    // Mark messages as seen
    const unreadMessages = transformedMessages.filter(
      (m: Message) => !m.seen_at && m.sender_id !== userId
    );
    if (unreadMessages.length > 0) {
      const now = new Date().toISOString();
      await supabase
        .from('messages')
        .update({ seen_at: now })
        .in('id', unreadMessages.map((m) => m.id));
    }
  };


  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: userId,
        content: content.trim(),
      });

    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col h-[600px] max-h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <MessageList messages={messages} currentUserId={userId} threadId={threadId} />
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}

