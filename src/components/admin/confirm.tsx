/**
 * One confirmation dialog for the admin console, replacing the browser's own
 * confirm and prompt. The layout follows the shadcn/ui alert dialog: title,
 * consequence, then Cancel and the action. Built on the project's Radix dialog.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, fieldClass } from './kit';
import { cn } from '../../lib/utils';

export interface ConfirmOptions {
  title: string;
  /** What will happen, in one or two sentences. */
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  /** Shows a text field; its value is returned as `reason`. */
  reasonLabel?: string;
}

/** `null` when cancelled. */
export type ConfirmAnswer = { reason: string } | null;

type Ask = (options: ConfirmOptions) => Promise<ConfirmAnswer>;

const ConfirmContext = createContext<Ask | null>(null);

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm needs a ConfirmProvider');
  return ask;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState('');
  const resolver = useRef<((answer: ConfirmAnswer) => void) | null>(null);

  const ask = useCallback<Ask>((options) => {
    // A second question replaces the first, which counts as cancelled
    resolver.current?.(null);
    setReason('');
    setRequest(options);
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const answer = (value: ConfirmAnswer) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Dialog.Root open={!!request} onOpenChange={(open) => { if (!open) answer(null); }}>
        {request && (
          <Dialog.Portal>
            <Dialog.Overlay className="admin-fade fixed inset-0 z-[230] bg-black/70" />
            <Dialog.Content
              role="alertdialog"
              // A choice is required: pressing outside does nothing
              onInteractOutside={(e) => e.preventDefault()}
              {...(request.body ? {} : { 'aria-describedby': undefined })}
              className="admin-pop fixed left-1/2 top-1/2 z-[231] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-[#0c0c10] p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.7)] outline-none"
            >
              <form onSubmit={(e) => { e.preventDefault(); answer({ reason: reason.trim() }); }}>
                <Dialog.Title className="text-base font-bold font-display">{request.title}</Dialog.Title>
                {request.body && (
                  <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-white/70">{request.body}</Dialog.Description>
                )}
                {request.reasonLabel && (
                  <label className="mt-4 block text-xs font-medium text-white/70">
                    {request.reasonLabel}
                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={cn(fieldClass, 'mt-1.5 w-full')} />
                  </label>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  {/* Without a text field, Cancel comes first in focus order so Enter is safe */}
                  <Button onClick={() => answer(null)}>Cancel</Button>
                  <Button type="submit" variant={request.tone === 'danger' ? 'danger' : 'primary'}>
                    {request.confirmLabel}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
