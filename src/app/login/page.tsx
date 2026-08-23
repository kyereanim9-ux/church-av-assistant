'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Radio, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-stage">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber text-stage">
            <Radio className="h-6 w-6" />
          </span>
          <h1 className="font-display text-lg uppercase tracking-wide text-ink dark:text-cream">Church AV Assistant</h1>
          <p className="text-sm text-ink-soft dark:text-cream/60">Le manuel audiovisuel intelligent de l&apos;équipe</p>
        </div>

        <form onSubmit={handleSubmit} className="rack-card space-y-4 p-6">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@eglise.local"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-soft dark:text-cream/40">
          Compte de démonstration : voir le README fourni par votre administrateur.
        </p>
      </div>
    </div>
  );
}
