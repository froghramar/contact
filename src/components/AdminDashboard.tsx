import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Thread } from '../types/database';
import './AdminDashboard.css';

interface AdminDashboardProps {
  onThreadSelect?: (threadId: string) => void;
  selectedThreadId?: string | null;
}

export default function AdminDashboard({ onThreadSelect, selectedThreadId }: AdminDashboardProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
    subscribeToThreads();
  }, []);

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from('threads')
      .select(`
        *,
        user:user_profiles!threads_user_id_fkey(email)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading threads:', error);
      return;
    }

    // Get last message and unread count for each thread
    const threadsWithMessages = await Promise.all(
      (data || []).map(async (thread) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .is('seen_at', null)
          .neq('sender_id', thread.user_id); // Only count messages not from thread owner

        return {
          ...thread,
          user: thread.user ? { email: thread.user.email } : undefined,
          last_message: messages?.[0],
          unread_count: count || 0,
        };
      })
    );

    setThreads(threadsWithMessages);
    setLoading(false);
  };

  const subscribeToThreads = () => {
    const channel = supabase
      .channel('admin-threads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
        },
        () => {
          loadThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading) {
    return <div className="admin-dashboard-loading">Loading threads...</div>;
  }

  if (threads.length === 0) {
    return <div className="admin-dashboard-empty">No chat threads yet.</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="threads-list">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`thread-item ${selectedThreadId === thread.id ? 'thread-selected' : ''}`}
            onClick={() => onThreadSelect?.(thread.id)}
          >
            <div className="thread-header">
              <div className="thread-email">{thread.user?.email || 'Unknown User'}</div>
              {thread.unread_count! > 0 && (
                <span className="thread-unread-badge">{thread.unread_count}</span>
              )}
            </div>
            {thread.last_message && (
              <div className="thread-preview">
                {thread.last_message.content.substring(0, 50)}
                {thread.last_message.content.length > 50 ? '...' : ''}
              </div>
            )}
            <div className="thread-time">
              {new Date(thread.updated_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

