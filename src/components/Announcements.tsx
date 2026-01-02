import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { formatDistanceToNow } from 'date-fns';
import './Announcements.css';

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
}

export default function Announcements({ isAdmin }: AnnouncementsProps) {
  const [threads, setThreads] = useState<AnnouncementThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [postingThreadId, setPostingThreadId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
    subscribeToAnnouncements();
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

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          loadAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_threads',
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      <div className="announcements-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="announcements-container">
      <div className="announcements-header">
        <h2>Announcements</h2>
        {isAdmin && (
          <button
            className="btn-new-announcement"
            onClick={() => {
              if (selectedThreadId) {
                setPostingThreadId(selectedThreadId);
                setShowPostForm(true);
              }
            }}
          >
            New Announcement
          </button>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="announcements-empty">
          No announcement threads yet.
        </div>
      ) : (
        <div className="announcements-content">
          <div className="announcements-sidebar">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`announcement-thread-item ${
                  selectedThreadId === thread.id ? 'thread-selected' : ''
                }`}
                onClick={() => setSelectedThreadId(thread.id)}
              >
                <div className="thread-title">{thread.title}</div>
                <div className="thread-meta">
                  {thread.announcements?.length || 0} announcement
                  {(thread.announcements?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="announcements-main">
            {selectedThread && (
              <>
                <div className="announcements-list">
                  {selectedThread.announcements?.length === 0 ? (
                    <div className="announcements-empty-state">
                      No announcements in this thread yet.
                    </div>
                  ) : (
                    selectedThread.announcements?.map((announcement) => (
                      <div key={announcement.id} className="announcement-item">
                        <div className="announcement-header">
                          <span className="announcement-time">
                            {formatDistanceToNow(new Date(announcement.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className="announcement-content">
                          <ReactMarkdown
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={className} {...props}>
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
                  <div className="announcement-post-form">
                    <h3>Post New Announcement</h3>
                    <textarea
                      className="announcement-textarea"
                      value={newAnnouncementContent}
                      onChange={(e) => setNewAnnouncementContent(e.target.value)}
                      placeholder="Write your announcement in Markdown..."
                      rows={10}
                    />
                    <div className="form-actions">
                      <button
                        className="btn-cancel"
                        onClick={() => {
                          setShowPostForm(false);
                          setNewAnnouncementContent('');
                          setPostingThreadId(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-post"
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

