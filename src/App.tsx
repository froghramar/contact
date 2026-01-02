import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, ADMIN_EMAIL } from './lib/supabase';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import AdminChatInterface from './components/AdminChatInterface';
import Announcements from './components/Announcements';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Contact Chat</h1>
        <div className="header-actions">
          <span className="user-email">{user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {isAdmin ? (
          <div className="admin-layout">
            <div className="admin-sidebar">
              <h2>Admin Dashboard</h2>
              <AdminDashboard 
                onThreadSelect={setSelectedThreadId} 
                selectedThreadId={selectedThreadId}
              />
            </div>
            <div className="admin-content">
              <Announcements isAdmin={true} />
              {selectedThreadId && (
                <div className="admin-chat-section">
                  <h2>Chat</h2>
                  <AdminChatInterface threadId={selectedThreadId} userId={user.id} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="user-layout">
            <Announcements />
            <ChatInterface userId={user.id} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

