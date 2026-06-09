'use client';

import { useEffect, useState } from 'react';

const USERS: Record<string, string> = {
  jlord: 'admin',
};

const SESSION_KEY = 'gym_authed';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === '1');
  }, []);

  function login(e: React.FormEvent) {
    e.preventDefault();
    const pw = USERS[username.toLowerCase().trim()];
    if (pw && pw === password) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
    } else {
      setError('Invalid username or password.');
      setPassword('');
    }
  }

  if (authed === null) return null; // avoid flash

  if (!authed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh max-w-sm mx-auto px-6 gap-8">
        <div className="text-center">
          <div className="text-5xl mb-3">💪</div>
          <h1 className="text-2xl font-bold">Gym Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={login} className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-600 outline-none focus:border-[#f5a623] transition-colors text-base"
          />
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Password"
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-600 outline-none focus:border-[#f5a623] transition-colors text-base"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-4 mt-1 bg-[#f5a623] text-black font-bold rounded-2xl text-lg active:scale-95 transition-transform"
          >
            Sign In
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
