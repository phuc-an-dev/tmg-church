"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Link2,
  UserRoundPlus,
  X,
} from "lucide-react";
import { cn } from "cn";
import { format, parseISO } from "date-fns";
import { reviewAccessRequest } from "./actions";
import type { AccessRequest } from "./queries";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  NavigationTabs,
  NavigationTabButton,
} from "@/components/shared/navigation-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { StatusToast } from "@/components/ui/status-toast";

function demographics(dateOfBirth: string | null, gender: string | null) {
  return [
    dateOfBirth ? format(parseISO(dateOfBirth), "dd/MM/yyyy") : null,
    gender === "male" ? "Male" : gender === "female" ? "Female" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const profileFields = [
  { key: "full_name", label: "Name" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
] as const;
type ProfileField = (typeof profileFields)[number]["key"];
function displayProfileValue(field: ProfileField, value: string | null) {
  if (!value?.trim()) return "Not provided";
  if (field === "date_of_birth") return format(parseISO(value), "dd/MM/yyyy");
  if (field === "gender") return value === "male" ? "Male" : "Female";
  return value;
}

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
};
export function AccessRequestList({
  requests,
  members,
}: {
  requests: AccessRequest[];
  members: Member[];
}) {
  const [status, setStatus] = useState("pending");
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [applicantExpanded, setApplicantExpanded] = useState(false);
  const [mode, setMode] = useState<"link" | "create" | "reject" | null>(null);
  const [actionTransition, setActionTransition] = useState(false);
  const nextModeRef = useRef<typeof mode>(null);
  function changeAction(nextMode: typeof mode) {
    if (pending || actionTransition) return;
    setError(null);
    nextModeRef.current = nextMode;
    setActionTransition(true);
  }
  function finishActionTransition() {
    setMode(nextModeRef.current);
    setActionTransition(false);
  }
  const [memberId, setMemberId] = useState("");
  const [linkStep, setLinkStep] = useState<"select" | "compare">("select");
  const [registrationFields, setRegistrationFields] = useState<ProfileField[]>(
    [],
  );
  const [expandedField, setExpandedField] = useState<ProfileField | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  function openRequest(value: AccessRequest) {
    setRequest(value);
    setActionTransition(false);
    setApplicantExpanded(false);
    setExpandedField(null);
    setMode(null);
    setLinkStep("select");
    setMemberId("");
    setRegistrationFields([]);
    setReason("");
    setError(null);
  }
  async function submit() {
    if (
      !request ||
      !mode ||
      pending ||
      (mode === "link" && linkStep !== "compare")
    )
      return;
    setPending(true);
    setError(null);
    try {
      const result = await reviewAccessRequest(
        mode === "reject"
          ? { requestId: request.id, decision: "rejected", reason }
          : {
              requestId: request.id,
              decision: "approved",
              createMember: mode === "create",
              memberId: mode === "link" ? memberId : undefined,
              registrationFields: mode === "link" ? registrationFields : [],
            },
      );
      if (!result.success) {
        setError(result.error ?? "Unable to review request.");
        return;
      }
      setRequest(null);
      setToast(
        mode === "reject" ? "Access request declined." : "Access approved.",
      );
      router.refresh();
    } catch {
      setError("Unable to review request. Please try again.");
    } finally {
      setPending(false);
    }
  }
  const selectedMember = members.find((member) => member.id === memberId);
  function selectMember(ids: string[]) {
    const id = ids[0] ?? "";
    setMemberId(id);
    const member = members.find((item) => item.id === id);
    setRegistrationFields(
      member && request
        ? profileFields
            .filter(
              ({ key }) =>
                !member[key]?.trim() && Boolean(request[key]?.trim()),
            )
            .map(({ key }) => key)
        : [],
    );
  }
  const visible = requests.filter((row) => row.status === status);
  const options = [...members].sort(
    (a, b) =>
      Number(b.email?.toLowerCase() === request?.email) -
      Number(a.email?.toLowerCase() === request?.email),
  );
  return (
    <div className="space-y-5">
      {toast && (
        <StatusToast message={toast} onDismiss={() => setToast(null)} />
      )}
      <NavigationTabs aria-label="Access request status">
        {["pending", "approved", "rejected"].map((value) => (
          <NavigationTabButton
            key={value}
            active={status === value}
            onClick={() => setStatus(value)}
          >
            {value === "pending"
              ? "Pending"
              : value === "approved"
                ? "Approved"
                : "Rejected"}
            <span className="bg-muted text-muted-foreground ml-1 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 text-xs tabular-nums">
              {requests.filter((row) => row.status === value).length}
            </span>
          </NavigationTabButton>
        ))}
      </NavigationTabs>
      {!visible.length ? (
        <EmptyState
          icon={UserRoundPlus}
          title="No access requests"
          description="Verified registration requests will appear here."
        />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {visible.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openRequest(row)}
              className="admin-panel-strong hover:border-primary/40 focus-visible:ring-primary min-h-14 w-full overflow-hidden text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex min-h-[72px] items-center gap-3 p-3">
                <MemberAvatar size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug font-semibold break-words">
                    {row.full_name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {format(parseISO(row.created_at), "MMM d, yyyy · HH:mm")}
                  </p>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
              </div>
            </button>
          ))}
        </div>
      )}
      <ResponsiveEditor
        open={Boolean(request) && !actionTransition}
        keepOverlay={Boolean(request)}
        onExitComplete={actionTransition ? finishActionTransition : undefined}
        onOpenChange={(open) => {
          if (!open && !pending && !actionTransition) setRequest(null);
        }}
        title={
          mode === "link" && linkStep === "compare"
            ? "Compare member details"
            : mode === "link"
              ? "Link member"
              : mode === "create"
                ? "Create member"
                : mode === "reject"
                  ? "Reject request"
                  : "Review access request"
        }
        mobileMinHeightClass="min-h-[85dvh]"
        footer={
          <>
            <Button
              variant="outline"
              className={cn(
                "transition-opacity duration-150 motion-reduce:transition-none",
                (!mode || request?.status !== "pending") && "col-span-2 w-full",
              )}
              disabled={pending || Boolean(actionTransition)}
              onClick={() => {
                if (mode === "link" && linkStep === "compare") {
                  setLinkStep("select");
                  setError(null);
                } else if (mode && request?.status === "pending") {
                  changeAction(null);
                } else setRequest(null);
              }}
            >
              {mode && request?.status === "pending" && (
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              )}
              {mode && request?.status === "pending"
                ? mode === "link" && linkStep === "compare"
                  ? "Back"
                  : "Change action"
                : "Cancel"}
            </Button>
            {request?.status === "pending" &&
              mode &&
              (mode === "reject" ? (
                <DestructiveActionButton
                  label={pending ? "Rejecting..." : "Reject request"}
                  icon={X}
                  className={cn(
                    "transition-opacity duration-150 motion-reduce:transition-none",
                  )}
                  disabled={
                    pending || Boolean(actionTransition) || !reason.trim()
                  }
                  onClick={() => void submit()}
                />
              ) : (
                <Button
                  className={cn(
                    "transition-opacity duration-150 motion-reduce:transition-none",
                  )}
                  disabled={
                    pending ||
                    Boolean(actionTransition) ||
                    (mode === "link" && !memberId)
                  }
                  onClick={() => {
                    if (mode === "link" && linkStep === "select")
                      setLinkStep("compare");
                    else void submit();
                  }}
                >
                  {pending
                    ? "Approving..."
                    : mode === "create"
                      ? "Create"
                      : linkStep === "select"
                        ? "Continue"
                        : "Approve & link"}
                </Button>
              ))}
          </>
        }
      >
        {request && (
          <section
            aria-label="Applicant details"
            className="bg-muted/20 mb-3 rounded-xl border px-3 py-2"
          >
            <button
              type="button"
              aria-expanded={applicantExpanded}
              aria-controls="applicant-details"
              onClick={() => setApplicantExpanded((value) => !value)}
              className="flex min-h-11 w-full items-center gap-2.5 text-left"
            >
              <MemberAvatar gender={request.gender} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug font-semibold break-words">
                  {request.full_name}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {format(parseISO(request.created_at), "MMM d, yyyy · HH:mm")}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
                  applicantExpanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            <div
              id="applicant-details"
              aria-hidden={!applicantExpanded}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
                applicantExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 pb-1">
                  <div className="col-span-2 min-w-0">
                    <dt className="text-muted-foreground text-xs">Email</dt>
                    <dd className="mt-1 text-sm break-all">{request.email}</dd>
                  </div>
                  {[
                    {
                      label: "Date of birth",
                      value: displayProfileValue(
                        "date_of_birth",
                        request.date_of_birth,
                      ),
                    },
                    {
                      label: "Gender",
                      value: displayProfileValue("gender", request.gender),
                    },
                    { label: "Phone", value: request.phone || "Not provided" },
                    {
                      label: "Submitted",
                      value: format(
                        parseISO(request.created_at),
                        "MMM d, yyyy · HH:mm",
                      ),
                    },
                  ].map((detail) => (
                    <div key={detail.label} className="min-w-0">
                      <dt className="text-muted-foreground text-xs">
                        {detail.label}
                      </dt>
                      <dd className="mt-1 text-sm break-words">
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        )}
        {error && (
          <p role="alert" className="text-destructive mb-4 text-sm">
            {error}
          </p>
        )}
        {request?.status !== "pending" ? (
          <div className="space-y-3">
            <p>Status: {request?.status}</p>
            {request?.rejection_reason && <p>{request.rejection_reason}</p>}
            {request?.reviewed_at && (
              <p className="text-muted-foreground text-sm">
                Reviewed{" "}
                {format(parseISO(request.reviewed_at), "MMM d, yyyy · HH:mm")}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-clip">
            <div className="space-y-4 px-1" inert={actionTransition}>
              {mode === null ? (
                <section className="space-y-2" aria-label="Choose action">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Choose action
                  </h3>
                  {[
                    {
                      key: "link",
                      label: "Link existing member",
                      icon: Link2,
                    },
                    {
                      key: "create",
                      label: "Create new member",
                      icon: UserRoundPlus,
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="bg-card hover:bg-muted/40 flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left"
                      onClick={() => {
                        changeAction(item.key as "link" | "create");
                      }}
                    >
                      <item.icon
                        className="text-primary size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium">
                          {item.label}
                        </span>
                      </span>
                      <ChevronRight
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  <DestructiveActionButton
                    label="Reject request"
                    icon={X}
                    className="!bg-card !text-foreground !border-border hover:!bg-muted/40 min-h-14 justify-start gap-3 rounded-xl px-3 text-base font-medium"
                    iconClassName="text-muted-foreground size-5"
                    onClick={() => {
                      changeAction("reject");
                    }}
                  />
                </section>
              ) : mode === "link" ? (
                <div className="space-y-4 overflow-x-clip px-1 py-1">
                  <ol
                    className={cn(
                      "relative grid grid-cols-2 pb-2 before:absolute before:top-4 before:right-[calc(25%+1.25rem)] before:left-[calc(25%+1.25rem)] before:h-px before:transition-colors before:duration-300",
                      linkStep === "compare"
                        ? "before:bg-primary/50"
                        : "before:bg-border",
                    )}
                    aria-label="Link member steps"
                  >
                    {[
                      { key: "select", label: "Select member" },
                      { key: "compare", label: "Compare details" },
                    ].map((step, index) => {
                      const complete = index === 0 && linkStep === "compare";
                      const active = linkStep === step.key;
                      return (
                        <li
                          key={step.key}
                          className="relative flex flex-col items-center gap-2 text-center"
                          aria-current={active ? "step" : undefined}
                        >
                          <span
                            className={cn(
                              "ring-card flex size-8 items-center justify-center rounded-full text-sm font-semibold ring-4",
                              complete
                                ? "bg-primary/10 text-primary"
                                : active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {complete ? (
                              <Check className="size-4" aria-hidden="true" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              !complete && !active && "text-muted-foreground",
                            )}
                          >
                            {step.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  {linkStep === "select" && (
                    <div
                      key="select"
                      className="animate-in slide-in-from-left-8 fade-in-0 space-y-4 duration-300 motion-reduce:animate-none"
                    >
                      <fieldset
                        disabled={pending || Boolean(actionTransition)}
                        className="w-full max-w-full min-w-0"
                      >
                        <MemberAssignDrawer
                          key={request?.id}
                          embedded
                          open={Boolean(request)}
                          onOpenChange={() => {}}
                          title="Link member"
                          searchPlaceholder="Search name or email"
                          singleSelect
                          selectedIds={memberId ? [memberId] : []}
                          onSelectedIdsChange={selectMember}
                          onAssign={() => {
                            if (memberId) setLinkStep("compare");
                          }}
                          pending={pending}
                          members={options.map((member) => ({
                            id: member.id,
                            name: member.full_name,
                            gender: member.gender,
                            subtitle:
                              [
                                demographics(
                                  member.date_of_birth,
                                  member.gender,
                                ),
                                member.email,
                                member.email?.toLowerCase() === request?.email
                                  ? "Email match"
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No details",
                          }))}
                          emptyListMessage="No available members."
                        />
                      </fieldset>
                    </div>
                  )}
                  {linkStep === "compare" && selectedMember && request && (
                    <section
                      key="compare"
                      className="animate-in slide-in-from-right-8 fade-in-0 space-y-3 border-t pt-4 duration-300 motion-reduce:animate-none"
                      aria-label="Review profile changes"
                    >
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold">
                          Review profile details
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Choose which details to save
                        </p>
                      </div>
                      {profileFields.map(({ key, label }) => {
                        const existing = selectedMember[key]?.trim() || null;
                        const incoming = request[key]?.trim() || null;
                        const same = existing === incoming;
                        const useRegistration =
                          registrationFields.includes(key);
                        const expanded = !same && expandedField === key;
                        return (
                          <div key={key} className="min-w-0 border-b py-2">
                            <div className="flex min-w-0 items-baseline justify-between gap-3">
                              <span className="text-muted-foreground shrink-0 text-xs">
                                {label}
                              </span>
                              <div className="min-w-0 text-right">
                                <span className="block text-sm [overflow-wrap:anywhere]">
                                  {displayProfileValue(
                                    key,
                                    useRegistration ? incoming : existing,
                                  )}
                                </span>
                                {!same && (
                                  <div className="flex flex-wrap items-center justify-end gap-x-2">
                                    <span className="text-muted-foreground text-xs">
                                      {useRegistration
                                        ? existing
                                          ? "Will be updated"
                                          : "Will be added"
                                        : "Keep existing"}
                                    </span>
                                    <button
                                      id={`change-profile-${key}`}
                                      type="button"
                                      aria-expanded={expanded}
                                      aria-controls={`profile-options-${key}`}
                                      disabled={pending}
                                      onClick={() =>
                                        setExpandedField(expanded ? null : key)
                                      }
                                      className="text-primary focus-visible:outline-primary min-h-11 min-w-11 rounded-md px-1 text-xs font-medium focus-visible:outline-2"
                                    >
                                      Change
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {!same && (
                              <div
                                id={`profile-options-${key}`}
                                aria-hidden={!expanded}
                                inert={!expanded}
                                className={cn(
                                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
                                  expanded
                                    ? "grid-rows-[1fr] opacity-100"
                                    : "grid-rows-[0fr] opacity-0",
                                )}
                              >
                                <div className="min-h-0 overflow-hidden">
                                  <div
                                    className={cn(
                                      "grid gap-2 pt-2 pb-1",
                                      key === "email"
                                        ? "grid-cols-1"
                                        : "grid-cols-2",
                                    )}
                                    role="group"
                                    aria-label={label}
                                  >
                                    {[false, true].map((registration) => {
                                      const selected =
                                        registration === useRegistration;
                                      return (
                                        <button
                                          key={String(registration)}
                                          type="button"
                                          disabled={
                                            pending ||
                                            (registration && !incoming)
                                          }
                                          aria-pressed={selected}
                                          aria-label={`${label}: use ${registration ? "registration" : "existing member"} details`}
                                          onClick={() => {
                                            setRegistrationFields((previous) =>
                                              registration
                                                ? [
                                                    ...previous.filter(
                                                      (field) => field !== key,
                                                    ),
                                                    key,
                                                  ]
                                                : previous.filter(
                                                    (field) => field !== key,
                                                  ),
                                            );
                                            setExpandedField(null);
                                            document
                                              .getElementById(
                                                `change-profile-${key}`,
                                              )
                                              ?.focus();
                                          }}
                                          className={cn(
                                            "focus-visible:outline-primary flex min-h-14 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default",

                                            selected
                                              ? "border-primary bg-primary/5"
                                              : "border-border bg-card",
                                            !existing &&
                                              !incoming &&
                                              "text-muted-foreground",
                                          )}
                                        >
                                          <span className="min-w-0 flex-1 space-y-0.5">
                                            <span className="text-muted-foreground block text-xs">
                                              {registration
                                                ? "Registration"
                                                : "Existing"}
                                            </span>
                                            <span className="block text-sm leading-snug [overflow-wrap:anywhere]">
                                              {displayProfileValue(
                                                key,
                                                registration
                                                  ? incoming
                                                  : existing,
                                              )}
                                            </span>
                                          </span>
                                          {selected && (
                                            <Check
                                              className="text-primary size-4 shrink-0"
                                              aria-hidden="true"
                                            />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <p className="text-muted-foreground text-xs">
                        Memberships, attendance, and assignments are preserved.
                      </p>
                    </section>
                  )}
                </div>
              ) : mode === "create" ? (
                <div className="space-y-2 rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    A new member profile will use the applicant details shown
                    above.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Ministry and group memberships can be assigned later in
                    Members.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="access-rejection-reason">
                    Reason for rejection
                  </Label>
                  <Input
                    id="access-rejection-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    disabled={pending || Boolean(actionTransition)}
                    className="min-h-11 text-base"
                  />
                  <p className="text-muted-foreground text-sm">
                    The applicant will see this reason on their access status
                    page.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ResponsiveEditor>
    </div>
  );
}
