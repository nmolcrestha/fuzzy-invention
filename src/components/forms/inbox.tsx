"use client";

import {
  DownloadIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  ReplyIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { replyAddress } from "@/sections/form";
import { deleteSubmission, markSubmissions, setFormNotifications } from "@/server/forms/actions";
import type { InboxMessage } from "@/server/forms/queries";

/** A one-line preview: the sender (first field) and the longest answer. */
function preview(message: InboxMessage) {
  const filled = message.fields.filter((field) => field.value);
  const from = filled[0]?.value ?? "Someone";
  const longest = [...filled.slice(1)].sort((a, b) => b.value.length - a.value.length)[0];
  return { from, snippet: longest?.value ?? "" };
}

export function Inbox({
  siteId,
  initialMessages,
  notificationsEnabled,
  ownerEmail,
  hasForm,
}: {
  siteId: string;
  initialMessages: InboxMessage[];
  notificationsEnabled: boolean;
  ownerEmail: string;
  /** Some page has a contact form section. */
  hasForm: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notify, setNotify] = useState(notificationsEnabled);
  const open = messages.find((message) => message.id === openId) ?? null;
  const unread = messages.filter((message) => !message.isRead).length;

  async function setRead(ids: string[], isRead: boolean) {
    setMessages((current) =>
      current.map((message) => (ids.includes(message.id) ? { ...message, isRead } : message)),
    );
    const result = await markSubmissions({ siteId, submissionIds: ids, isRead });
    if (!result.ok) toast.error(result.error);
  }

  function select(message: InboxMessage) {
    setOpenId(message.id);
    if (!message.isRead) void setRead([message.id], true);
  }

  async function toggleNotify(enabled: boolean) {
    setNotify(enabled);
    const result = await setFormNotifications({ siteId, enabled });
    if (!result.ok) {
      setNotify(!enabled);
      toast.error(result.error);
    } else {
      toast.success(
        enabled ? `We'll email ${ownerEmail} about new messages.` : "Message emails are off.",
      );
    }
  }

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id="notify"
            checked={notify}
            onCheckedChange={(value) => void toggleNotify(value)}
          />
          <Label htmlFor="notify" className="font-normal">
            Email me at <span className="font-medium">{ownerEmail}</span> when a message arrives
          </Label>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void setRead(
                  messages.filter((message) => !message.isRead).map((message) => message.id),
                  true,
                )
              }
            >
              <MailOpenIcon aria-hidden />
              Mark all as read
            </Button>
          )}
          {messages.length > 0 && (
            <a
              href={`/dashboard/sites/${siteId}/inbox/export`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              download
            >
              <DownloadIcon aria-hidden />
              Download as spreadsheet
            </a>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No messages yet"
          description={
            hasForm
              ? "Messages people send through your contact form will appear here once the page with the form is published."
              : "Add a “Contact form” section to a page and publish it. Messages people send will appear here."
          }
        />
      ) : (
        <div className="grid min-h-96 overflow-hidden rounded-xl border bg-card md:grid-cols-[320px_1fr]">
          <ul
            aria-label="Messages"
            className="divide-y overflow-y-auto border-b md:max-h-[70vh] md:border-r md:border-b-0"
          >
            {messages.map((message) => {
              const { from, snippet } = preview(message);
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => select(message)}
                    aria-current={message.id === openId || undefined}
                    className={cn(
                      "grid w-full gap-0.5 px-4 py-3 text-left text-sm hover:bg-muted",
                      message.id === openId && "bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {!message.isRead && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          !message.isRead && "font-semibold",
                        )}
                      >
                        {from}
                      </span>
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {timeAgo(new Date(message.createdAt))}
                      </span>
                    </span>
                    <span className="truncate text-muted-foreground">
                      {snippet || "No message"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-5">
            {!open ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <MailIcon className="size-6" aria-hidden />
                Choose a message to read it.
              </div>
            ) : (
              <MessageDetails
                key={open.id}
                message={open}
                onMarkUnread={() => {
                  void setRead([open.id], false);
                  setOpenId(null);
                }}
                onDelete={async () => {
                  const result = await deleteSubmission({ siteId, submissionId: open.id });
                  if (!result.ok) throw new Error(result.error);
                  setMessages((current) => current.filter((message) => message.id !== open.id));
                  setOpenId(null);
                  toast.success("Message deleted.");
                }}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MessageDetails({
  message,
  onMarkUnread,
  onDelete,
}: {
  message: InboxMessage;
  onMarkUnread: () => void;
  onDelete: () => Promise<void>;
}) {
  const reply = replyAddress(message.fields);
  return (
    <article className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Message from the “{message.pageTitle}” page</h2>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(new Date(message.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reply && (
            <a
              href={`mailto:${reply}?subject=${encodeURIComponent("Re: your message")}`}
              className={buttonVariants({ size: "sm" })}
            >
              <ReplyIcon aria-hidden />
              Reply by email
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onMarkUnread}>
            <MailIcon aria-hidden />
            Mark as unread
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2Icon aria-hidden />
                Delete
              </Button>
            }
            title="Delete this message?"
            description="It will be removed from your inbox for good. This can't be undone."
            confirmLabel="Delete message"
            tone="destructive"
            onConfirm={onDelete}
          />
        </div>
      </header>
      <dl className="grid gap-4">
        {message.fields.map((field, index) => (
          <div key={`${field.label}-${index}`}>
            <dt className="text-sm font-medium text-muted-foreground">{field.label}</dt>
            <dd className="break-words whitespace-pre-wrap">
              {field.value || <span className="text-muted-foreground italic">Left empty</span>}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
