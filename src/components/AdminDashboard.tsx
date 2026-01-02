import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Thread } from '../types/database';

interface AdminDashboardProps {
  onThreadSelect?: (threadId: string) => void;
  selectedThreadId?: string | null;
}

export default function AdminDashboard({ onThreadSelect, selectedThreadId }: AdminDashboardProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
    
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


  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading threads...</div>;
  }

  if (threads.length === 0) {
    return <div className="p-8 text-center text-gray-500">No chat threads yet.</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 bg-white ${
              selectedThreadId === thread.id
                ? 'bg-indigo-50 border-indigo-600'
                : 'border-gray-200 hover:bg-gray-50 hover:border-indigo-600'
            }`}
            onClick={() => onThreadSelect?.(thread.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-slate-800 text-sm">{thread.user?.email || 'Unknown User'}</div>
              {thread.unread_count! > 0 && (
                <span className="bg-red-600 text-white rounded-full px-2 py-1 text-xs font-semibold min-w-[20px] text-center">
                  {thread.unread_count}
                </span>
              )}
            </div>
            {thread.last_message && (
              <div className="text-gray-500 text-xs mb-2 truncate">
                {thread.last_message.content.substring(0, 50)}
                {thread.last_message.content.length > 50 ? '...' : ''}
              </div>
            )}
            <div className="text-xs text-gray-400">
              {new Date(thread.updated_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

