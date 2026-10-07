import { format, parseISO } from "date-fns";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { MemberSession } from "./member-session-queries";

export function MemberSessionDetail({
  session,
  fromAssignments,
}: {
  session: MemberSession;
  fromAssignments: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-24 sm:px-6">
      <AdminPageHeader
        title={session.title}
        description={`${session.scope} · ${format(parseISO(session.date), "EEE, MMM d, yyyy")}`}
        backLink={{
          href: `/portal?section=${fromAssignments ? "assignments" : "upcoming"}`,
          label: "Back",
        }}
      />
      {session.myRoles.length > 0 && (
        <section
          className="bg-primary/5 border-primary/20 space-y-2 rounded-xl border p-4"
          aria-label="Your assignments"
        >
          <h2 className="text-base font-medium">Your assignments</h2>
          {session.myRoles.map((role) => (
            <p key={role} className="text-sm">
              {role}
            </p>
          ))}
        </section>
      )}
      {session.roster.length > 0 && (
        <section className="bg-card rounded-xl border p-4">
          <h2 className="mb-3 text-base font-medium">Session team</h2>
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Session roles and members</caption>
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th scope="col" className="w-[35%] pb-2 font-medium">
                  Role
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Members
                </th>
              </tr>
            </thead>
            <tbody>
              {session.roster.map((role) => (
                <tr key={role.roleId} className="border-b last:border-0">
                  <th
                    scope="row"
                    className="py-3 pr-3 align-top font-medium break-words"
                  >
                    {role.roleName}
                  </th>
                  <td className="text-muted-foreground space-y-1 py-3 align-top break-words">
                    {role.memberNames.length
                      ? role.memberNames.map((name) => (
                          <span key={name} className="block">
                            {name}
                          </span>
                        ))
                      : "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
