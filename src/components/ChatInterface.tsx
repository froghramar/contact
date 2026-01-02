import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Reaction } from '../types/database';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatInterface.css';

interface ChatInterfaceProps {
  userId: string;
}

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeThread();
  }, [userId]);

  useEffect(() => {
    if (threadId) {
      loadMessages();
      subscribeToMessages();
      subscribeToReactions();
    }
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeThread = async () => {
    try {
      // Get or create thread for this user
      let { data: thread, error: threadError } = await supabase
        .from('threads')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (threadError && threadError.code === 'PGRST116') {
        // Thread doesn't exist, create it
        const { data: newThread, error: createError } = await supabase
          .from('threads')
          .insert({ user_id: userId })
          .select('id')
          .single();

        if (createError) throw createError;
        thread = newThread;
      } else if (threadError) {
        throw threadError;
      }

      setThreadId(thread!.id);
    } catch (error) {
      console.error('Error initializing thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!threadId) return;

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

    // Transform the data to match our Message type
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

  const subscribeToMessages = () => {
    if (!threadId) return;

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToReactions = () => {
    if (!threadId) return;

    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (content: string) => {
    if (!threadId || !content.trim()) return;

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

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Chat</h2>
        <p className="chat-subtitle">Start a conversation</p>
      </div>

      <div className="chat-messages-container">
        <MessageList messages={messages} currentUserId={userId} threadId={threadId!} />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}

