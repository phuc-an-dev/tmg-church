# TMG Church Auth and Portal Manual Test Cases

**Target:** production (`https://tmgchurch.website`)

**Test style:** mobile-first. Run the primary pass at the smallest supported mobile viewport, then repeat the smoke checks on desktop.

**Date:** ____________________ **Tester:** ____________________

## Test accounts and data

Use real test accounts with these labels. Do not record passwords, invitation tokens, or recovery links in this document.

| Label    | Required setup                                                                     |
| -------- | ---------------------------------------------------------------------------------- |
| MA       | `master_admin` for the production Church                                           |
| ADMIN    | `admin` for the production Church                                                  |
| MH       | Ministry Head in an active Ministry Term                                           |
| DL       | Matching Department commissioner/Department leader in the same active Term         |
| GL       | Group Leader in an active Group                                                    |
| DGL      | Deputy Leader in the same Group                                                    |
| BSL      | Bible Study Leader in the same Group                                               |
| MEMBER   | Enrolled in the active Ministry Term, with no operational role                     |
| OUTSIDER | Authenticated member from another scope, or a member without the target enrollment |
| CLOSED   | A closed Term containing historical Group/Department data                          |
| DRAFT    | A draft Term with prepared assignments, if available                               |

Record the actual slugs used during the run:

- Ministry: `____________________`
- Active Term: `____________________`
- Department A: `____________________`
- Department B: `____________________`
- Group A: `____________________`
- Group B: `____________________`
- Test session: `____________________`

## Execution rules

- Start every case from a fresh private/incognito window or sign out before changing persona.
- Verify the URL after every navigation. Do not rely only on hidden buttons; try the direct URL for deny cases.
- For destructive cases, use a disposable session, request, role, or member assignment and restore it where possible.
- Capture evidence for failures: screenshot, URL, persona, timestamp, and visible error/result.
- Mark `Actual result`, `Status`, and `Evidence` while testing.

Status key: `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`.

## P0 — Authentication and route boundary

| ID       | Persona                     | Preconditions and steps                                                         | Expected result                                                                                          | Actual result / status / evidence |
| -------- | --------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| AUTH-001 | Anonymous                   | Open `/admin` directly.                                                         | Redirects to `/admin/login`; no admin data is visible.                                                   |                                   |
| AUTH-002 | Anonymous                   | Open `/portal` directly.                                                        | Access is denied or redirected; no member data is visible.                                               |                                   |
| AUTH-003 | MEMBER                      | Sign in with email/password. Open `/portal`.                                    | Portal loads; the member can see only permitted active-term surfaces.                                    |                                   |
| AUTH-004 | MEMBER                      | Open `/admin` directly.                                                         | Admin access is denied; no administration data is exposed.                                               |                                   |
| AUTH-005 | MA                          | Sign in and open `/admin`.                                                      | Admin shell loads and Church/Ministry management is available.                                           |                                   |
| AUTH-006 | ADMIN                       | Sign in and open `/admin`.                                                      | Admin shell loads; system-role controls remain restricted to MA.                                         |                                   |
| AUTH-007 | Authenticated unlinked user | Sign in, then open `/portal` and `/admin`.                                      | `/portal` and `/admin` are denied because no linked member profile exists.                               |                                   |
| AUTH-008 | Any authenticated user      | Sign out, then use browser Back and refresh protected pages.                    | Session is not restored; protected data remains unavailable.                                             |                                   |
| AUTH-009 | Invitee                     | Use a valid invitation once, set password, sign in, and revisit activation URL. | First activation succeeds; replay is rejected; the Auth account remains usable through password sign-in. |                                   |
| AUTH-010 | Invitee                     | Use an expired, revoked, or superseded invitation.                              | Activation is rejected with a safe user-facing error; no account/member link is created.                 |                                   |

## P0 — Persona capability matrix

Run each row against the active Term and the target scope. `Allow` means the page/action completes; `Deny` means the direct URL/action is rejected without data leakage.

| ID      | Persona  | Read own portal       | Read target Group               | Manage Group members            | Manage Group sessions/attendance | Read Department              | Manage Department members    | Manage service roles         | Decide Department requests       |
| ------- | -------- | --------------------- | ------------------------------- | ------------------------------- | -------------------------------- | ---------------------------- | ---------------------------- | ---------------------------- | -------------------------------- |
| CAP-001 | MA       | Allow                 | Allow                           | Allow                           | Allow                            | Allow                        | Allow                        | Allow                        | Allow                            |
| CAP-002 | ADMIN    | Allow                 | Allow                           | Allow                           | Allow                            | Allow                        | Allow                        | Allow                        | Allow                            |
| CAP-003 | MH       | Allow                 | Only assigned/allowed scope     | Deny unless separately assigned | Deny unless separately assigned  | Allow in active Term         | Allow in active Term         | Allow in active Term         | Allow in active Term             |
| CAP-004 | DL       | Allow                 | Deny unless separately assigned | Deny                            | Deny                             | Allow in matching Department | Allow in matching Department | Allow in matching Department | Allow in matching Department     |
| CAP-005 | GL       | Allow                 | Allow in own Group              | Allow in own Group              | Allow in own Group               | Deny                         | Deny                         | Deny                         | Deny                             |
| CAP-006 | DGL      | Allow                 | Allow in own Group              | Allow in own Group              | Read/history only                | Deny                         | Deny                         | Deny                         | Deny                             |
| CAP-007 | BSL      | Allow                 | Read/history in own Group       | Deny                            | Read/history only                | Deny                         | Deny                         | Deny                         | Deny                             |
| CAP-008 | MEMBER   | Allow                 | Only member-visible scope       | Deny                            | Deny operational writes          | Read/request targets only    | Deny                         | Deny                         | Submit/withdraw own request only |
| CAP-009 | OUTSIDER | Allow own portal only | Deny                            | Deny                            | Deny                             | Deny                         | Deny                         | Deny                         | Deny                             |

## P0 — New portal routes

Replace placeholders with the actual slugs recorded above.

| ID        | Route                                                                               | Personas                  | Expected                                                                                                 |
| --------- | ----------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| ROUTE-001 | `/portal`                                                                           | All linked members        | Portal shell loads and displays only the persona's permitted cards.                                      |
| ROUTE-002 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/members`                 | GL, DGL, BSL, MA, ADMIN   | Own Group roles see the scoped directory; unauthorized users are denied or receive an empty safe result. |
| ROUTE-003 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/sessions`                | GL, DGL, BSL, MA, ADMIN   | Session list is scoped to the Group and Term.                                                            |
| ROUTE-004 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/sessions/{session}`      | GL, DGL, BSL, MA, ADMIN   | Session detail and attendance are scoped to the Group.                                                   |
| ROUTE-005 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/members`       | DL, MH, MA, ADMIN         | Department directory is scoped to the exact active Department.                                           |
| ROUTE-006 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/requests`      | MEMBER, DL, MH, MA, ADMIN | Member sees own request flow; Department authority sees decision queue.                                  |
| ROUTE-007 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/service-roles` | DL, MH, MA, ADMIN         | Authorized managers can manage service roles and assignments. Others are denied.                         |
| ROUTE-008 | `/admin/church/advanced`                                                            | MA, ADMIN                 | System role/invitation controls load; only MA can change Admin assignments.                              |
| ROUTE-009 | `/admin/ministries/{ministry}/terms/{term}`                                         | MA, ADMIN                 | Ministry members, Ministry roles, sessions, and lifecycle controls load.                                 |
| ROUTE-010 | `/admin/ministries/{ministry}/terms/{term}/groups/{group}`                          | MA, ADMIN                 | Group members and leadership management load.                                                            |
| ROUTE-011 | `/admin/ministries/{ministry}/terms/{term}/departments/{department}`                | MA, ADMIN                 | Department members and service-role administration load.                                                 |

## P1 — Group workflow tests

| ID        | Persona      | Steps                                                                                | Expected                                                                                               |
| --------- | ------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| GROUP-001 | GL           | Create a session in own active Group.                                                | Session is created and visible only in that Group/Term.                                                |
| GROUP-002 | GL           | Edit the new session, record one attendance entry, and save.                         | Changes persist and attendance is scoped to eligible active Group members.                             |
| GROUP-003 | GL           | Delete an empty disposable session.                                                  | Session is deleted; destructive confirmation is clear.                                                 |
| GROUP-004 | DGL          | Open own Group sessions and attendance history.                                      | Read succeeds; create/edit/delete/attendance mutation controls are denied.                             |
| GROUP-005 | BSL          | Open own Group sessions and try a mutation by direct URL/action.                     | History read succeeds; mutation is denied.                                                             |
| GROUP-006 | GL/DGL       | Assign a regular enrolled member to own Group, then remove that member.              | Assignment and removal succeed within the Group; leadership roles are not removed by this flow.        |
| GROUP-007 | GL           | Try to assign a member from another Term or move a member out of another open Group. | Operation is denied and existing membership remains unchanged.                                         |
| GROUP-008 | GL           | Try to manage Group B by changing only the URL slug.                                 | Read and write are denied; Group A data is not exposed.                                                |
| GROUP-009 | DRAFT/CLOSED | Try to create/edit/delete a session or record attendance.                            | Draft and closed lifecycle gates reject operational mutation, including for MA/ADMIN where applicable. |

## P1 — Department member and request workflow tests

| ID       | Persona | Steps                                                           | Expected                                                                                          |
| -------- | ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| DEPT-001 | MEMBER  | Open Department A requests and submit one request.              | Pending request is created only for the enrolled member and Department A.                         |
| DEPT-002 | MEMBER  | Refresh/reopen the request page.                                | Member sees the own request and status; other requesters' names/statuses/reasons are not exposed. |
| DEPT-003 | MEMBER  | Withdraw the pending request.                                   | Status becomes withdrawn; a new request can be submitted later.                                   |
| DEPT-004 | MEMBER  | Try to submit a request while not enrolled in the Term.         | RPC/action is denied.                                                                             |
| DEPT-005 | MEMBER  | Submit a second request while one is pending.                   | Duplicate pending request is rejected.                                                            |
| DEPT-006 | DL      | Open Department A request queue.                                | Matching Department authority sees pending requests and safe requester details.                   |
| DEPT-007 | DL      | Approve a pending request.                                      | Request becomes approved and exactly one Department assignment is created.                        |
| DEPT-008 | DL      | Reject a pending request without entering a reason.             | Request becomes rejected and a non-empty fallback rejection reason is stored.                     |
| DEPT-009 | MEMBER  | Reapply after rejection.                                        | New pending request can be submitted.                                                             |
| DEPT-010 | DL      | Try to decide a request belonging to Department B.              | Decision is denied; request remains unchanged.                                                    |
| DEPT-011 | DL      | Assign and remove an enrolled member from Department A.         | Assignment changes succeed only in the matching active Department.                                |
| DEPT-012 | DL      | Try to assign a member from another Term or another Department. | Operation is denied.                                                                              |
| DEPT-013 | MEMBER  | Open Department B request route by changing the slug.           | Only safe target/request information is shown; unauthorized private queue data is not exposed.    |

## P1 — Department service-role workflow tests

| ID          | Persona | Steps                                                                                  | Expected                                                                                     |
| ----------- | ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SERVICE-001 | DL      | Create a service role in Department A.                                                 | Role is created and appears in the Department service-role catalog.                          |
| SERVICE-002 | DL      | Rename/update the disposable service role.                                             | Name changes without moving the role to another Department.                                  |
| SERVICE-003 | DL      | Create a disposable Department A session, choose a role/member, and assign the member. | Assignment succeeds when session, role, member, and Term/Department all match.               |
| SERVICE-004 | DL      | Remove the service assignment.                                                         | Assignment is removed without deleting the role or member.                                   |
| SERVICE-005 | DL      | Try to assign a Department A role to a Department B session.                           | RPC rejects the assignment.                                                                  |
| SERVICE-006 | DL      | Try to assign a role to a session with no Department or a member from another Term.    | RPC rejects the assignment.                                                                  |
| SERVICE-007 | DL      | Try to delete a role that still has assignments.                                       | Delete is rejected; assignment remains intact.                                               |
| SERVICE-008 | GL      | Open Department service-role route and call the visible/direct action.                 | Access and mutation are denied; Group Leader receives no Department service-role capability. |
| SERVICE-009 | MEMBER  | Open Department service-role route directly.                                           | Access is denied; private role/assignment data is not exposed.                               |

## P1 — Admin role-management tests

| ID       | Persona  | Steps                                                                                                                | Expected                                                                  |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ROLE-001 | MA       | Add/remove an ADMIN candidate from Church Advanced settings.                                                         | Admin capability changes immediately; MA remains protected.               |
| ROLE-002 | ADMIN    | Try to add/remove an Admin or change Master Admin.                                                                   | Operation is denied.                                                      |
| ROLE-003 | MA/ADMIN | Assign each Ministry role in an active Term, then remove it.                                                         | One seat per role is enforced; capability appears/disappears immediately. |
| ROLE-004 | MA/ADMIN | Reassign a Ministry role to another enrolled member.                                                                 | Old assignment is replaced atomically; duplicate seat is impossible.      |
| ROLE-005 | MA/ADMIN | Try to assign a Ministry role to a member outside the Term.                                                          | Operation is denied.                                                      |
| ROLE-006 | MA/ADMIN | Prepare a role in a draft Term.                                                                                      | Assignment may be stored, but it has no operational capability.           |
| ROLE-007 | MA/ADMIN | Try to mutate a role assignment in a closed Term.                                                                    | Operation is denied; historical read remains available.                   |
| ROLE-008 | MA/ADMIN | Assign/remove Group Leader, Deputy Leader, and Bible Study Leader through the existing Group administration surface. | Leadership constraints hold; no duplicate active seat is created.         |

## P1 — Lifecycle and revocation tests

| ID       | Persona         | Steps                                                                                                         | Expected                                                                                           |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| LIFE-001 | Any role holder | Remove the role in another admin session while the user is signed in. Refresh and retry the protected action. | Capability is resolved from current database state; action is denied immediately after revocation. |
| LIFE-002 | MA/ADMIN        | Move a Term from draft to active.                                                                             | Prepared assignments become operational only after activation.                                     |
| LIFE-003 | MA/ADMIN        | Close an active Term.                                                                                         | Operational writes stop; historical reads remain available.                                        |
| LIFE-004 | Any role holder | Try to reopen a closed Term or edit closed membership/session data.                                           | Operation is denied.                                                                               |
| LIFE-005 | Any persona     | Change URL from active Term A to closed/draft Term B.                                                         | Lifecycle and scope rules apply to the target Term, not the current page.                          |

## P1 — Direct Data API and RPC bypass tests

Use an authenticated browser session or a prepared API client. Record only the HTTP status/error code, never access tokens.

| ID      | Persona   | Attempt                                                                | Expected                                                                          |
| ------- | --------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| API-001 | BSL       | Direct insert/update/delete on Group session/attendance tables.        | Read-only role receives denial (`42501`/equivalent); no row changes.              |
| API-002 | GL        | Direct write to another Group's session, roster, or attendance row.    | Denied by scope RLS/RPC.                                                          |
| API-003 | MEMBER    | Direct insert/update/delete on `department_join_request`.              | Direct table mutation is denied; only the approved RPC can submit/withdraw.       |
| API-004 | MEMBER    | Call `portal_decide_department_request`.                               | Denied because member lacks `department.members.manage`.                          |
| API-005 | DL        | Call service-assignment RPC with a mismatched Department/session/Term. | Denied; no assignment is created.                                                 |
| API-006 | OUTSIDER  | Select private Department/Group projections directly.                  | Empty/denied result; no phone, auth ID, private note, or other member data leaks. |
| API-007 | Anonymous | Call protected portal RPCs without a session.                          | Denied; no sensitive error details.                                               |
| API-008 | ADMIN     | Directly change system role tables as a normal authenticated client.   | Direct table writes are denied; approved RPC hierarchy still applies.             |

## P2 — UI and usability regression

| ID     | Persona | Check                                                       | Expected                                                                                 |
| ------ | ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| UI-001 | All     | Run the primary flow at mobile width.                       | No horizontal overflow; cards are readable; controls have touch-friendly targets.        |
| UI-002 | All     | Open create/edit/detail/confirmation interactions.          | Mobile uses a bottom drawer/sheet rather than a centered modal.                          |
| UI-003 | All     | Navigate by keyboard on desktop.                            | Focus is visible; buttons and links are reachable; no native select is required.         |
| UI-004 | All     | Trigger validation, empty, loading, and error states.       | State is understandable and does not expose raw database errors or secrets.              |
| UI-005 | All     | Use browser Back/Forward and refresh on deep portal routes. | Scope and selected route remain correct; no unauthorized content appears during loading. |
| UI-006 | All     | Check dark mode and long Vietnamese names.                  | Text remains readable and does not break layout.                                         |

## Exit criteria

The manual pass is accepted when:

- All P0 cases are `PASS`.
- All applicable P1 cases are `PASS` or have a documented, approved blocker.
- No unauthorized persona can read or mutate data through a direct URL, Server Action, RPC, or Data API call.
- No private phone number, Auth user ID, invitation token, private note, or other protected field appears in an unauthorized result.
- Any production failure has a screenshot/URL/persona/timestamp and a reproducible description.

## Test summary

- P0 passed: `____ / ____`
- P1 passed: `____ / ____`
- P2 passed: `____ / ____`
- Failed cases: `____________________________________________`
- Blocked cases: `___________________________________________`
- Follow-up issue/commit: `__________________________________`
