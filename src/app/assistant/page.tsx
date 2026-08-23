'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader2, Database, Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

type Message = { role: 'user' | 'assistant'; text: string; error?: boolean };

const SUGGESTIONS = [
  'Quel matériel est installé dans le DC Room de la salle principale ?',
  'Je ne trouve plus le convertisseur SDI, où est-il ?',
  "Je n'ai pas d'image sur l'écran, que faire ?",
  'Comment reconnecter le système de streaming ?',
];

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantChat />
    </Suspense>
  );
}

function AssistantChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (data.error && !data.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error, error: true }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Une erreur est survenue. Réessayez.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-4rem)]">
      <PageHeader eyebrow="Assistant IA" title="Poser une question" subtitle="Réponses basées en priorité sur votre base de données." />

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="rack-card flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <p className="text-sm text-ink-soft dark:text-cream/60">
              Posez une question sur le matériel, les salles ou les branchements. Si l&apos;information n&apos;est
              pas dans la base de données, l&apos;assistant vous le dira clairement.
            </p>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="label-tag border border-ink/15 text-ink-soft hover:bg-ink/5 dark:border-white/10 dark:text-cream/60 dark:hover:bg-white/5">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-amber text-stage'
                  : m.error
                    ? 'rack-card border-l-4 border-l-danger'
                    : 'rack-card'
              }`}
            >
              {m.role === 'assistant' && !m.error && (
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-soft dark:text-cream/40">
                  <Database className="h-3 w-3" /> Assistant IA
                </p>
              )}
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rack-card flex items-center gap-2 px-4 py-2.5 text-sm text-ink-soft dark:text-cream/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche dans la base de données…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-center gap-2 border-t border-ink/10 pt-3 dark:border-white/10"
      >
        <input
          className="field-input flex-1"
          placeholder="Ex : Comment installer la caméra dans la salle principale ?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-4">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
