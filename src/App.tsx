import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, ADMIN_EMAIL } from './lib/supabase';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import AdminChatInterface from './components/AdminChatInterface';
import Announcements from './components/Announcements';
import ChatPrompt from './components/ChatPrompt';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

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
      if (session?.user) {
        setShowLogin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLogin) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Contact Chat</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-300 hidden sm:inline">{user.email}</span>
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowLogin(true)} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Admin Dashboard</h2>
              <AdminDashboard 
                onThreadSelect={setSelectedThreadId} 
                selectedThreadId={selectedThreadId}
              />
            </div>
            <div className="flex flex-col gap-8">
              <Announcements isAdmin={true} user={user} />
              {selectedThreadId && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-4">Chat</h2>
                  <AdminChatInterface threadId={selectedThreadId} userId={user!.id} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <Announcements />
            {user ? (
              <ChatInterface userId={user.id} />
            ) : (
              <ChatPrompt onStartChat={() => setShowLogin(true)} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

