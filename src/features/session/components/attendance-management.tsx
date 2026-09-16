"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { StatusToast } from "@/components/ui/status-toast";
import { saveAttendanceAction } from "../actions";
import type { SessionDetail } from "../types";
export function AttendanceManagement({ session }: { session: SessionDetail }) {
  const [pending, setPending] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");
  async function set(
    memberId: string,
    status: "present" | "absent" | "excused",
  ) {
    setPending(memberId);
    const r = await saveAttendanceAction({
      sessionId: session.id,
      memberId,
      status,
    });
    setPending(null);
    setToast(r.message ?? r.error ?? "");
  }
  return (
    <section className="space-y-3">
      {session.participants.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6">
          No enrolled active members are available for this term.
        </p>
      ) : (
        session.participants.map((p) => (
          <article className="rounded-xl border p-4" key={p.memberId}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{p.fullName}</span>
              <span className="text-muted-foreground text-sm">
                {p.status ?? "Not recorded"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["present", "absent", "excused"] as const).map((s) => (
                <Button
                  key={s}
                  variant={p.status === s ? "default" : "outline"}
                  disabled={pending === p.memberId}
                  onClick={() => set(p.memberId, s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </article>
        ))
      )}
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </section>
  );
}
