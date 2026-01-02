import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
      <div className="bg-white rounded-xl p-10 w-full max-w-md shadow-2xl">
        <h1 className="text-center text-3xl font-bold text-slate-800 mb-2">Contact Chat</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {isSignUp ? 'Create an account to start chatting' : 'Login to start chatting'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-medium text-slate-800 text-sm">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-indigo-600 transition-colors duration-200"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-medium text-slate-800 text-sm">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-indigo-600 transition-colors duration-200"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-base font-semibold transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="bg-transparent border-none text-indigo-600 cursor-pointer text-sm underline px-2 py-2 hover:text-indigo-700 transition-colors duration-200"
          >
            {isSignUp
              ? 'Already have an account? Login'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

