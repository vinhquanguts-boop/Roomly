import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SendHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import {
  getDesignChat,
  sendDesignChat,
  type ChatAction,
  type ChatMessage,
} from '@/lib/api';

type ChatPanelProps = {
  designId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionApplied: (action: ChatAction, changedPosition: number | null) => void;
};

type PendingMessage = {
  id: string;
  role: 'user';
  content: string;
  createdAt: string;
  pending: true;
};

function MessageBubble({ message }: { message: ChatMessage | PendingMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
          isUser
            ? 'bg-accent text-white'
            : 'border border-border-subtle bg-bg-elevated text-text-primary',
          'pending' in message ? 'opacity-70' : ''
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatPanel({ designId, open, onOpenChange, onActionApplied }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [pendingUserMessage, setPendingUserMessage] = useState<PendingMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const chatQuery = useQuery({
    queryKey: ['design-chat', designId],
    queryFn: () => getDesignChat(designId),
    enabled: open && Boolean(designId),
  });

  const messages = useMemo(() => {
    const saved = chatQuery.data?.messages ?? [];
    return pendingUserMessage ? [...saved, pendingUserMessage] : saved;
  }, [chatQuery.data?.messages, pendingUserMessage]);

  const sendMutation = useMutation({
    mutationFn: (message: string) => sendDesignChat(designId, message),
    onSuccess: async (result) => {
      setPendingUserMessage(null);
      setError(null);
      onActionApplied(result.action, result.changedPosition);
      queryClient.setQueryData(['design', designId], { design: result.design });
      await queryClient.invalidateQueries({ queryKey: ['design-chat', designId] });
    },
    onError: (mutationError) => {
      setPendingUserMessage(null);
      setError(mutationError instanceof Error ? mutationError.message : 'Chat refinement failed.');
    },
  });

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sendMutation.isPending) return;
    trackEvent('chat_message_sent');

    setDraft('');
    setError(null);
    setPendingUserMessage({
      id: `pending-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
      pending: true,
    });
    sendMutation.mutate(message);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] border-border-subtle bg-bg-base p-0 text-text-primary sm:max-w-[440px]">
        <SheetHeader className="border-b border-border-subtle px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary-muted text-accent">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <div>
              <SheetTitle className="text-left text-xl font-bold text-text-primary">Refine this room</SheetTitle>
              <SheetDescription className="text-left text-sm text-text-secondary">
                Ask a question, swap an item, or change the direction.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {chatQuery.isPending ? (
            <p className="text-sm font-semibold text-text-secondary">Loading chat...</p>
          ) : messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-bg-elevated p-4 text-sm leading-6 text-text-secondary">
              Try “swap the rug for something cheaper” or “why did you choose this palette?”
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {sendMutation.isPending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3 text-sm font-semibold text-text-secondary">
                Thinking...
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border-subtle bg-bg-elevated px-5 py-4">
          {error ? <p className="text-left text-sm font-semibold text-destructive">{error}</p> : null}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask for a swap or a style change"
              className="max-h-32 min-h-11 resize-none bg-bg-base text-sm"
              disabled={sendMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="size-11 shrink-0 rounded-md"
              disabled={sendMutation.isPending || draft.trim().length === 0}
              aria-label="Send message"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
