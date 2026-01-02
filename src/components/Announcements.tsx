import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  thread_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  announcements?: Announcement[];
}

interface AnnouncementsProps {
  isAdmin?: boolean;
  user?: User | null;
}

export default function Announcements({ isAdmin, user }: AnnouncementsProps) {
  const [threads, setThreads] = useState<AnnouncementThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [postingThreadId, setPostingThreadId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const { data: threadsData, error: threadsError } = await supabase
      .from('announcement_threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (threadsError) {
      console.error('Error loading announcement threads:', threadsError);
      setLoading(false);
      return;
    }

    // Load announcements for each thread
    const threadsWithAnnouncements = await Promise.all(
      (threadsData || []).map(async (thread) => {
        const { data: announcements } = await supabase
          .from('announcements')
          .select('*')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false });

        return {
          ...thread,
          announcements: announcements || [],
        };
      })
    );

    setThreads(threadsWithAnnouncements);
    if (threadsWithAnnouncements.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threadsWithAnnouncements[0].id);
    }
    setLoading(false);
  };


  const handlePostAnnouncement = async () => {
    if (!postingThreadId || !newAnnouncementContent.trim()) return;

    const { error } = await supabase.from('announcements').insert({
      thread_id: postingThreadId,
      content: newAnnouncementContent.trim(),
    });

    if (error) {
      console.error('Error posting announcement:', error);
      alert('Failed to post announcement');
      return;
    }

    setNewAnnouncementContent('');
    setShowPostForm(false);
    setPostingThreadId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12 bg-white rounded-xl shadow-sm">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-slate-800">Announcements</h2>
        {isAdmin && user && threads.length > 0 && selectedThreadId && (
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200"
            onClick={() => {
              setPostingThreadId(selectedThreadId);
              setShowPostForm(true);
            }}
          >
            New Announcement
          </button>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="text-center p-12 text-gray-500">
          No announcement threads yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
          <div className="flex flex-col gap-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedThreadId === thread.id
                    ? 'bg-indigo-50 border-indigo-600'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-indigo-600'
                }`}
                onClick={() => setSelectedThreadId(thread.id)}
              >
                <div className="font-semibold text-slate-800 mb-1">{thread.title}</div>
                <div className="text-xs text-gray-500">
                  {thread.announcements?.length || 0} announcement
                  {(thread.announcements?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6">
            {selectedThread && (
              <>
                <div className="flex flex-col gap-6">
                  {selectedThread.announcements?.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                      No announcements in this thread yet.
                    </div>
                  ) : (
                    selectedThread.announcements?.map((announcement) => (
                      <div key={announcement.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div className="flex justify-end mb-4">
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(announcement.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-800">
                          <ReactMarkdown
                            components={{
                              code({ className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const inline = !match;
                                return !inline ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus as any}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={`${className} bg-gray-200 px-1.5 py-0.5 rounded text-sm`} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {announcement.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isAdmin && showPostForm && postingThreadId === selectedThreadId && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Post New Announcement</h3>
                    <textarea
                      className="w-full p-4 border-2 border-gray-200 rounded-lg font-mono text-sm resize-y mb-4 focus:outline-none focus:border-indigo-600 transition-colors duration-200"
                      value={newAnnouncementContent}
                      onChange={(e) => setNewAnnouncementContent(e.target.value)}
                      placeholder="Write your announcement in Markdown..."
                      rows={10}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-4 py-2 bg-white text-slate-800 border border-gray-200 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50"
                        onClick={() => {
                          setShowPostForm(false);
                          setNewAnnouncementContent('');
                          setPostingThreadId(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handlePostAnnouncement}
                        disabled={!newAnnouncementContent.trim()}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

