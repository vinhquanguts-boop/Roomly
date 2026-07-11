import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import gsap from 'gsap';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createChatSession, sendChatMessage, type PreChatMessage } from '@/lib/api';

const GREETING: PreChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi! I'm your Roomly design assistant. Before we dive into creating your room design, let me ask a few questions to help tailor everything to your taste. What room are you looking to refresh — and what's the biggest thing about it you'd love to change?",
  createdAt: new Date().toISOString(),
};

export function PreDesignChatPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<PreChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [readyToDesign, setReadyToDesign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Page entrance animation
  useEffect(() => {
    if (reduced || !pageRef.current) return;
    gsap.fromTo(pageRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
  }, [reduced]);

  // Create session on mount
  useEffect(() => {
    createChatSession()
      .then(({ sessionId: sid }) => setSessionId(sid))
      .catch(() => {
        setError('Chat is unavailable right now. You can still continue to the designer.');
      })
      .finally(() => setIsSessionLoading(false));
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  }, [messages, reduced]);

  // Animate latest assistant message in
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || reduced) return;
    const selector = `[data-msg-id="${last.id}"]`;
    const el = document.querySelector(selector);
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
  }, [messages, reduced]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!sessionId) {
      setError('Chat is still connecting. Try again in a moment, or continue to the designer.');
      return;
    }

    const userMsg: PreChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendChatMessage(sessionId, text);
      setMessages((prev) => [...prev, result.message]);
      if (result.readyToDesign) {
        setReadyToDesign(true);
        if (result.brief) {
          sessionStorage.setItem('roomly.chat.brief', JSON.stringify(result.brief));
        }
      }
    } catch {
      setError('Could not reach the AI. Try again or skip to the designer.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleSkip() {
    navigate('/design/upload');
  }

  function handleStartDesign() {
    navigate('/design/upload');
  }

  return (
    <div ref={pageRef} className="flex h-dvh flex-col bg-bg-base text-text-primary" style={{ opacity: 0 }}>
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-elevated px-5 py-3">
        <Link to="/" className="transition-opacity hover:opacity-70">
          <Logo variant="full" size="sm" color="accent" />
        </Link>
        <Button variant="ghost" className="gap-2 text-sm" onClick={handleSkip}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Skip to designer
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[680px] space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              data-msg-id={msg.id}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={[
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6',
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-accent text-white'
                    : 'rounded-bl-sm border border-border-subtle bg-bg-elevated text-text-primary',
                ].join(' ')}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border-subtle bg-bg-elevated px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block size-2 rounded-full bg-text-secondary"
                    style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ready to design prompt */}
          {readyToDesign && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-sm font-semibold text-text-secondary">Ready to start designing?</p>
              <Button onClick={handleStartDesign} className="gap-2">
                Go to designer
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {error && (
            <p className="text-center text-sm font-semibold text-destructive">{error}</p>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border-subtle bg-bg-elevated px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-[680px] items-end gap-3">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSessionLoading ? 'Connecting to Roomly...' : 'Type your message (Enter to send)'}
            disabled={isLoading || isSessionLoading || !sessionId || readyToDesign}
            className="flex-1 resize-none rounded-xl border border-border-subtle bg-bg-base px-4 py-2.5 text-sm leading-6 outline-none focus:border-accent disabled:opacity-50"
          />
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading || isSessionLoading || !sessionId || readyToDesign}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-text-secondary md:text-left md:max-w-[680px] md:mx-auto">
          This is optional — chat helps us tailor the design, but you can{' '}
          <button type="button" className="underline hover:text-accent" onClick={handleSkip}>
            skip straight to uploading
          </button>
          .
        </p>
      </div>
    </div>
  );
}
