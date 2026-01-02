import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { AnnouncementReaction } from '../types/database';

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
  const [reactions, setReactions] = useState<Record<string, AnnouncementReaction[]>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (threads.length > 0) {
      loadReactions();
    }
  }, [threads]);

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

  const loadReactions = async () => {
    // Get all announcement IDs from current threads state
    const announcementIds: string[] = [];
    threads.forEach((thread) => {
      thread.announcements?.forEach((announcement) => {
        announcementIds.push(announcement.id);
      });
    });

    if (announcementIds.length === 0) {
      setReactions({});
      return;
    }

    const { data } = await supabase
      .from('announcement_reactions')
      .select('*')
      .in('announcement_id', announcementIds);

    if (data) {
      const reactionsMap: Record<string, AnnouncementReaction[]> = {};
      data.forEach((reaction) => {
        if (!reactionsMap[reaction.announcement_id]) {
          reactionsMap[reaction.announcement_id] = [];
        }
        reactionsMap[reaction.announcement_id].push(reaction);
      });
      setReactions(reactionsMap);
    } else {
      setReactions({});
    }
  };

  const handleReaction = async (announcementId: string, emoji: string) => {
    if (!user) return;

    // Check if user already reacted with this emoji
    const existing = reactions[announcementId]?.find(
      (r) => r.announcement_id === announcementId && r.user_id === user.id && r.emoji === emoji
    );

    // Optimistically update UI immediately
    const updatedReactions = { ...reactions };
    if (!updatedReactions[announcementId]) {
      updatedReactions[announcementId] = [];
    }

    if (existing) {
      // Remove reaction from UI immediately
      updatedReactions[announcementId] = updatedReactions[announcementId].filter(
        (r) => r.id !== existing.id
      );
      setReactions(updatedReactions);

      // Remove reaction from database
      await supabase.from('announcement_reactions').delete().eq('id', existing.id);
    } else {
      // Add reaction to UI immediately (temporary ID, will be replaced on next load)
      const tempReaction: AnnouncementReaction = {
        id: `temp-${Date.now()}`,
        announcement_id: announcementId,
        user_id: user.id,
        emoji,
        created_at: new Date().toISOString(),
      };
      updatedReactions[announcementId] = [...updatedReactions[announcementId], tempReaction];
      setReactions(updatedReactions);

      // Add reaction to database
      const { data, error } = await supabase
        .from('announcement_reactions')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      // Update with real ID from database if successful
      if (data && !error) {
        updatedReactions[announcementId] = updatedReactions[announcementId].map((r) =>
          r.id === tempReaction.id ? data : r
        );
        setReactions(updatedReactions);
      } else if (error) {
        // Revert on error
        updatedReactions[announcementId] = updatedReactions[announcementId].filter(
          (r) => r.id !== tempReaction.id
        );
        setReactions(updatedReactions);
        console.error('Error adding reaction:', error);
      }
    }
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
    
    // Reload announcements to show the new one
    await loadAnnouncements();
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
                    selectedThread.announcements?.map((announcement) => {
                      const announcementReactions = reactions[announcement.id] || [];
                      const reactionGroups = announcementReactions.reduce((acc, reaction) => {
                        if (!acc[reaction.emoji]) {
                          acc[reaction.emoji] = [];
                        }
                        acc[reaction.emoji].push(reaction);
                        return acc;
                      }, {} as Record<string, AnnouncementReaction[]>);

                      return (
                        <div key={announcement.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <div className="relative">
                              {user && (
                                <>
                                  <button
                                    className="bg-white border border-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-50 transition-colors duration-200"
                                    onClick={() => {
                                      setShowEmojiPicker((prev) => ({
                                        ...prev,
                                        [announcement.id]: !prev[announcement.id],
                                      }));
                                    }}
                                    title="Add reaction"
                                  >
                                    😊
                                  </button>
                                  {showEmojiPicker[announcement.id] && (
                                    <div className="absolute top-full left-0 mt-2 z-[1000]">
                                      <EmojiPicker
                                        onEmojiClick={(emojiObject) => {
                                          handleReaction(announcement.id, emojiObject.emoji);
                                          setShowEmojiPicker((prev) => ({
                                            ...prev,
                                            [announcement.id]: false,
                                          }));
                                        }}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
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
                          {Object.keys(reactionGroups).length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-4">
                              {Object.entries(reactionGroups).map(([emoji, reactionList]) => {
                                const hasUserReaction = user && reactionList.some((r) => r.user_id === user.id);
                                return (
                                  <button
                                    key={emoji}
                                    className={`flex items-center gap-1 bg-white border px-2 py-1 rounded-full text-xs transition-all duration-200 hover:bg-gray-50 hover:border-indigo-600 ${
                                      hasUserReaction ? 'bg-indigo-50 border-indigo-600' : 'border-gray-200'
                                    } ${!user ? 'cursor-default' : 'cursor-pointer'}`}
                                    onClick={() => user && handleReaction(announcement.id, emoji)}
                                    title={`${reactionList.length} reaction${reactionList.length > 1 ? 's' : ''}`}
                                    disabled={!user}
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
                    })
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

