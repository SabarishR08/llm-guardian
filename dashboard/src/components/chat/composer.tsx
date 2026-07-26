"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import type { Attachment } from "@/features/chat/types";
import { cn } from "@/lib/utils";

const MAX_ATTACH_BYTES = 32 * 1024;

export function Composer({
  onSend,
  onStop,
  sending,
  prefill,
}: {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  sending: boolean;
  prefill?: string;
}) {
  const [value, setValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (prefill !== undefined) {
      setValue(prefill);
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
          resize(ta);
        }
      });
    }
  }, [prefill]);

  function resize(ta: HTMLTextAreaElement) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  function submit() {
    const text = value.trim();
    if ((!text && attachments.length === 0) || sending) return;
    onSend(text, attachments.length ? attachments : undefined);
    setValue("");
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = "auto";
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files).slice(0, 4)) {
      // Attempt to read any file ≤ 32 KB as UTF-8 text so Guardian can
      // inspect its content regardless of extension (.pdf, .docx, etc.).
      // Truly binary files will produce garbled text, but demo/test payloads
      // are text-based and this lets Guardian scan them properly.
      let content: string | undefined;
      if (f.size <= MAX_ATTACH_BYTES) {
        try {
          content = await f.text();
          // Discard if the result looks entirely non-printable (real binary).
          const printable = content.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, "");
          if (printable.length < content.length * 0.7) content = undefined;
        } catch {
          content = undefined;
        }
      }
      next.push({ name: f.name, size: f.size, content });
    }
    setAttachments((a) => [...a, ...next]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-2 flex flex-wrap gap-1.5"
          >
            {attachments.map((a, i) => (
              <span
                key={a.name + i}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 py-1 pl-2 pr-1 text-xs text-muted"
              >
                <Paperclip className="size-3" />
                {a.name}
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded p-0.5 hover:bg-surface hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors focus-within:border-primary/40">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip className="size-4.5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />

        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Ask Guardian anything, or paste a suspicious payload…"
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[0.925rem] leading-relaxed text-foreground outline-none placeholder:text-subtle"
        />

        {sending ? (
          <button
            onClick={onStop}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-foreground transition-colors hover:bg-surface-hover"
            aria-label="Stop"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() && attachments.length === 0}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all",
              value.trim() || attachments.length
                ? "bg-primary text-white hover:bg-primary-bright"
                : "bg-surface text-subtle",
            )}
            aria-label="Send"
          >
            <ArrowUp className="size-4.5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[0.7rem] text-subtle">
        Every message and tool response is inspected by Guardian in real time.
      </p>
    </div>
  );
}
