"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { loadCareDetailAction } from "../actions";
import type { CareDetail as CareDetailData } from "../types";
import { CareEditor, type CareEditorMode } from "./care-editor";

export function CareDetail({
  initialDetail,
}: {
  initialDetail: CareDetailData;
}) {
  const router = useRouter();
  const [state, setState] = useState({
    source: initialDetail,
    detail: initialDetail,
  });
  let detail = state.detail;
  if (state.source !== initialDetail) {
    detail = initialDetail;
    setState({ source: initialDetail, detail: initialDetail });
  }
  function setDetail(value: CareDetailData) {
    setState({ source: initialDetail, detail: value });
  }
  const [editor, setEditor] = useState<CareEditorMode | null>(null);
  const [message, setMessage] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const item = detail.case;
  const path = `/portal/ministries/${item.ministrySlug}/terms/${item.termSlug}/care/${item.slug}`;
  async function refresh() {
    setRefreshing(true);
    try {
      const result = await loadCareDetailAction({
        ministrySlug: item.ministrySlug,
        termSlug: item.termSlug,
        careSlug: item.slug,
      });
      if (!result.success) throw new Error("Care refresh failed");
      setDetail(result.data);
      setRefreshFailed(false);
      setMessage("");
      router.refresh();
    } catch {
      setDetail({
        ...detail,
        notes: [],
        canReadNotes: false,
        canUpdate: false,
        canAssign: false,
      });
      setRefreshFailed(true);
      setMessage(
        "Changes were saved, but the follow-up could not be refreshed. Refresh to see the latest information.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setMessage("Link copied.");
    } catch {
      setMessage(
        "Unable to copy the link. Open the follow-up page to copy its address.",
      );
    }
  }
  return (
    <div className="min-w-0 space-y-6 py-2">
      <div className="flex items-start gap-3">
        <MemberAvatar />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold break-words">
            {item.memberName}
          </h2>
          <p className="text-muted-foreground text-sm">
            {item.groupName ?? "Group not recorded"}
          </p>
        </div>
      </div>
      {detail.readOnly && (
        <p className="bg-muted rounded-xl p-3 text-sm">
          Read-only: this term has closed.
        </p>
      )}
      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        {[
          [
            "Status",
            item.status === "in_progress"
              ? "In progress"
              : item.status === "resolved"
                ? "Resolved"
                : "Open",
          ],
          ["Assignee", item.assigneeName ?? "Not assigned"],
          ["Next contact date", item.nextContactDate ?? "Not scheduled"],
          ["Term", item.termName],
          [
            "Source",
            item.source === "attendance" ? "Attendance suggestion" : "Manual",
          ],
          [
            "Created",
            new Date(item.createdAt).toLocaleString("en-GB", {
              timeZone: "Asia/Ho_Chi_Minh",
            }),
          ],
          ...(item.resolvedAt
            ? [
                [
                  "Resolved",
                  new Date(item.resolvedAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  }),
                ],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {!!item.sourceEvidence.sessions?.length && (
        <section className="space-y-2">
          <h3 className="font-semibold">Attendance at creation</h3>
          <ul className="space-y-2">
            {item.sourceEvidence.sessions.map((session) => (
              <li
                key={session.id}
                className="bg-muted/50 rounded-xl p-3 text-sm"
              >
                {session.date} · Absent
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            This records the attendance used when the follow-up was created.
          </p>
        </section>
      )}
      <Button
        variant="outline"
        className="min-h-11 text-base"
        onClick={copyLink}
      >
        <Copy className="size-4" aria-hidden="true" />
        Copy link
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {refreshFailed && (
        <Button
          variant="outline"
          className="min-h-11 text-base"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? "Refreshing..." : "Refresh follow-up"}
        </Button>
      )}
      {!detail.readOnly && item.status !== "resolved" && (
        <div className="flex flex-wrap gap-2">
          {detail.canUpdate && (
            <>
              {item.status === "open" && (
                <Button
                  className="min-h-11 text-base"
                  disabled={refreshing}
                  onClick={() => setEditor("start")}
                >
                  Start follow-up
                </Button>
              )}
              <Button
                variant="outline"
                className="min-h-11 text-base"
                disabled={refreshing}
                onClick={() => setEditor("date")}
              >
                Update contact date
              </Button>
              <Button
                variant="outline"
                className="min-h-11 text-base"
                disabled={refreshing}
                onClick={() => setEditor("resolve")}
              >
                Resolve
              </Button>
            </>
          )}
          {detail.canAssign && item.groupId && (
            <Button
              variant="outline"
              className="min-h-11 text-base"
              disabled={refreshing}
              onClick={() => setEditor("assign")}
            >
              Assign
            </Button>
          )}
        </div>
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Private notes</h3>
          {detail.canReadNotes &&
            detail.canUpdate &&
            !detail.readOnly &&
            item.status !== "resolved" && (
              <Button
                className="min-h-11 text-base"
                disabled={refreshing}
                onClick={() => setEditor("note")}
              >
                Add note
              </Button>
            )}
        </div>
        {!detail.canReadNotes ? (
          <p className="text-muted-foreground text-sm">
            Private notes are available only to the assigned caregiver and this
            term&apos;s Care commissioner.
          </p>
        ) : detail.notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notes yet.</p>
        ) : (
          <ol className="space-y-3">
            {detail.notes.map((note) => (
              <li key={note.id} className="border-border rounded-xl border p-4">
                <p className="text-base break-words whitespace-pre-wrap">
                  {note.note}
                </p>
                <p className="text-muted-foreground mt-3 text-xs">
                  {note.authorName || "Unknown author"} ·{" "}
                  {new Date(note.createdAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {editor && (
        <CareEditor
          mode={editor}
          detail={detail}
          onClose={() => setEditor(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
