# Care — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Cung cấp luồng hỏi thăm thành viên vắng sinh hoạt nhóm cho trưởng nhóm và ủy viên thăm viếng và chăm sóc, với ghi chú riêng tư và lịch sử theo nhiệm kỳ.

**Architecture:** Mở rộng `care_flag`/`care_note` hiện có; mọi quyền và mutation được kiểm tra tại database bằng RPC/RLS, có Server Actions dùng Zod. Trang portal đọc dữ liệu bằng Server Components; gợi ý điểm danh được tính khi đọc và xác nhận lại khi tạo việc, không cần worker.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript, Supabase, `@supabase/ssr`, Zod, Tailwind CSS, `nuqs`, Lucide và component chia sẻ hiện có.

**Spec:** [Thiết kế Care](../specs/2026-10-08-care-follow-up-design.md).

## Global Constraints

- Phạm vi: hỏi thăm người vắng nhóm; người dùng là trưởng nhóm và `visitation_care_commissioner`.
- Gợi ý: ba buổi nhóm gần nhất trước hôm nay theo `Asia/Ho_Chi_Minh`, cả ba có `Absent`; `Excused`, `Present`, thiếu điểm danh ngắt chuỗi.
- Ghi chú: chỉ người được giao còn vai trò hợp lệ và ủy viên đúng nhiệm kỳ; không có bypass admin.
- Term `active` được thao tác, `closed` chỉ đọc, `draft` không mở luồng Care. Không chuyển việc hoặc ghi chú sang nhiệm kỳ mới.
- Không dùng service-role key, backend riêng, dependency mới, cron hoặc provider gửi tin.
- Mọi mutation có Zod ở server và integrity/authorization ở RPC. Không để database error thô xuất hiện trên UI.
- Mobile card/bottom drawer, controls 16 px, touch targets 44 × 44 px; footer sticky có safe area; option cards `min-h-14 rounded-xl`.
- Code, comments, UI copy và nhãn trợ năng tiếng Anh; tài liệu giải thích tiếng Việt.
- Không sửa migration đã áp, không `supabase db reset`; migration mới additive và giữ nguyên dữ liệu cũ.
- Kiểm tra trên local. Chỉ chạy `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` khi người dùng yêu cầu commit theo `AGENTS.md`. Không tự commit/push hoặc áp migration hosted.
- Trước viết code, đọc các guide Next.js được cài tại `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `07-mutating-data.md` và file convention `loading.md`.

## Thứ tự và file map

1. Database/integrity → 2. Quyền Care và RPC → 3. Gợi ý điểm danh → 4. Server feature → 5. UI/route → 6. Portal entry point và nghiệm thu.

| File                                                              | Trách nhiệm                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/migrations/20261009000000_care_follow_up.sql`           | Schema và integrity; kiểm tra tên không trùng trước khi tạo     |
| `supabase/migrations/20261009000001_care_access_and_actions.sql`  | Helper quyền, RLS, grants, mutation RPC và audit                |
| `supabase/migrations/20261009000002_care_absence_suggestions.sql` | Read RPC scope/history/detail/suggestions và xác nhận gợi ý     |
| `src/types/database.ts`                                           | Types sinh từ schema local sau migration                        |
| `src/features/care/types.ts`, `schemas.ts`, `search-params.ts`    | Contract UI, Zod và URL filters                                 |
| `src/features/care/queries.ts`, `actions.ts`                      | Server data/auth và mutation adapter                            |
| `src/features/care/components/care-list.tsx`                      | Tab list/suggestions/history, filter và pagination              |
| `src/features/care/components/care-detail.tsx`                    | Metadata và timeline ghi chú có quyền                           |
| `src/features/care/components/care-editor.tsx`                    | Drawer tạo việc và thao tác ghi chú/phân công/ngày liên hệ      |
| `src/features/care/components/care-skeleton.tsx`                  | Loading hình dạng danh sách và chi tiết                         |
| Routes Care được ghi ở Task 5                                     | Resolve slug trên server và render feature                      |
| `src/components/portal/portal-sidebar.tsx`, `portal-header.tsx`   | Entry point Care hiển thị theo quyền, không đưa note vào header |
| `docs/care-acceptance.md`                                         | Checklist chứng cứ local và bàn giao                            |

## Task 1: Mở rộng dữ liệu và bảo vệ integrity

**Files:** Create migration `20261009000000_care_follow_up.sql`; read schema/types hiện có.

**Interfaces:**

- Consumes: `care_flag`, `care_note`, `member_profile`, `ministry_membership`, `term_group_membership`, `term_group`, `ministry_term`.
- Produces: cột mới theo spec, slug case duy nhất, constraints/triggers và index chống việc mở trùng.

- [x] Đọc lại definitions của các bảng và mọi migration có nhắc `care_flag`/`care_note`; xác nhận file migration mới không đè file cũ.
- [x] Thêm `term_group_id`, `assignee_member_profile_id`, `created_by_member_profile_id`, `resolved_by_member_profile_id` với FK `ON DELETE RESTRICT`; giữ nullable để không bịa dữ liệu legacy.
- [x] Thêm `slug` duy nhất dạng `care-<random UUID without hyphens>` độc lập với internal ID, `status` (`open`, `in_progress`, `resolved`), `next_contact_date`, `resolved_at`, `source` (`manual`, `attendance`), `source_evidence jsonb`; chuẩn hóa legacy về `open`/`manual`, không suy luận nhóm/tác giả.
- [x] Thêm `author_member_profile_id` cho `care_note`; legacy null được hiển thị `Unknown author`, note mới bắt buộc tác giả qua RPC.
- [x] Partial unique index trên `(member_profile_id, ministry_term_id, term_group_id, flag_type)` khi group không null và status thuộc `open/in_progress`; giữ các bản ghi legacy group-null riêng.
- [x] Trigger ngăn sửa member/term/group/source/evidence của hồ sơ và ngăn sửa/delete ghi chú. Kiểm tra group thuộc term, member cùng church; kiểm tra membership theo thời điểm tạo tại RPC, không làm trigger chặn thao tác resolve sau khi thành viên rời nhóm.
- [x] Constraint resolved-state cần `resolved_at`, `resolved_by_member_profile_id` cho việc mới; dữ liệu cũ chỉ là open, không bịa người xử lý.
- [x] Đọc migration trước khi áp local bằng lệnh được AGENTS quy định. Không áp vào hosted.

**Acceptance:** Dữ liệu cũ còn nguyên; insert/update khác term/church bị từ chối; race hai việc mở cùng scope chỉ tạo được một.

Các biểu thức schema cần dùng trong migration Task 1:

```sql
alter table public.care_flag
  add column slug text not null default ('care-' || replace(gen_random_uuid()::text, '-', '')),
  add column status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved')),
  add column source text not null default 'manual'
    check (source in ('manual', 'attendance')),
  add column source_evidence jsonb not null default '{}'::jsonb;
create unique index care_flag_slug_unique on public.care_flag(slug);
-- Add the group FK column before creating this index.
create unique index care_flag_open_group_member_unique
  on public.care_flag(member_profile_id, ministry_term_id, term_group_id, flag_type)
  where term_group_id is not null and status in ('open', 'in_progress');
```

## Task 2: Quyền riêng cho Care, mutation và audit

**Files:** Create `20261009000001_care_access_and_actions.sql`.

**Interfaces:**

- Consumes: schema Task 1; `authorization_current_member_profile_id()`, `term_role_assignment`, `term_group_membership`, `application_audit_log`.
- Produces helpers: `care_can_coordinate(p_term_id uuid)`, `care_can_manage_group(p_group_id uuid)`, `care_can_read_case(p_case_id uuid)`, `care_can_read_notes(p_case_id uuid)`.
- Produces mutations: `create_care_follow_up(p_group_id uuid, p_member_id uuid, p_assignee_id uuid, p_next_contact_date date) returns uuid`; `update_care_follow_up(p_case_id uuid, p_status text, p_next_contact_date date)`; `assign_care_follow_up(p_case_id uuid, p_assignee_id uuid)`; `add_care_note(p_case_id uuid, p_note text) returns uuid`.

- [x] Helper commissioner xác nhận role `visitation_care_commissioner` đúng term và member không archived. Helper group leader xác nhận `group_leader`, membership active và `ended_at IS NULL`; không lấy generic `group.members.manage` vì capability đó còn dành cho deputy/admin.
- [x] Read-case cho commissioner đúng term hoặc trưởng nhóm đúng group. Read-note chỉ commissioner hoặc assignee đồng thời còn role Care hợp lệ; không coi creator là quyền xem vĩnh viễn.
- [x] Với term `closed`, áp dụng cùng phạm vi read-case/read-note; mọi mutation từ chối. Term `draft` không có Care. Case legacy group-null chỉ commissioner đúng term đọc.
- [x] Thay policy admin-full-access trên hai bảng; cấp SELECT theo helpers, revoke trực tiếp INSERT/UPDATE/DELETE từ `authenticated`, `anon`, `PUBLIC`; mutations chỉ qua RPC được cấp EXECUTE cho `authenticated`.
- [x] SECURITY DEFINER dùng search path cố định/schema-qualified queries, kiểm tra `auth.uid()` và scope trong mỗi RPC; helper không return note qua data scope rộng. Không để default EXECUTE cho `PUBLIC`.
- [x] RPC create kiểm tra member đang active trong group và term active. Trưởng nhóm chỉ giao cho chính mình; commissioner giao cho chính mình hoặc trưởng nhóm active của group. Không cho chỉ định arbitrary member hay member khác church.
- [x] RPC assign chỉ commissioner, lock case row; RPC update/add-note chỉ assignee hợp lệ hoặc commissioner và term active. Case resolved/closed không nhận note/update mới.
- [x] Khi resolve ghi người/thời gian ở database; không hard-delete hay reopen. Ngày hỏi thăm có thể để trống; ngày quá hạn được UI gắn nhãn, không thêm trạng thái.
- [x] Ghi audit action `care.created`, `care.assigned`, `care.updated`, `care.resolved`, `care.note_added` bằng IDs/status trong transaction. Không lưu note, tên/điện thoại hoặc source evidence có thông tin riêng tư vào audit.

**Acceptance:** Direct Supabase API và RPC không bypass quyền; người được giao cũ mất quyền note ngay sau đổi assignee/thu hồi vai trò; generic admin không đọc ghi chú.

## Task 3: Gợi ý điểm danh và query dữ liệu Care

**Files:** Create `20261009000002_care_absence_suggestions.sql`; update `src/types/database.ts` từ schema local đầy đủ.

**Interfaces:**

- Consumes: Task 1/2 helpers, `ministry_session`, `session_participant`, `attendance_record`, thời gian membership.
- Produces read RPCs: `get_my_care_scopes() returns jsonb`, `get_care_list(p_term_id uuid, p_group_id uuid, p_tab text, p_page integer, p_query text) returns jsonb`, `get_care_detail(p_case_id uuid) returns jsonb`, `get_care_absence_suggestions(p_term_id uuid, p_group_id uuid, p_page integer) returns jsonb`.
- Produces confirmation RPC: `create_care_follow_up_from_absence(p_group_id uuid, p_member_id uuid, p_assignee_id uuid, p_next_contact_date date) returns uuid`.
- JSON response list: `{items, totalCount, page, pageSize}` với pageSize 20; detail `{case, notes, canReadNotes, canUpdate, canAssign, readOnly}`; scope `{termId, ministrySlug, termSlug, termName, lifecycle, groups, canCoordinate}`.

- [x] `get_my_care_scopes` lấy roles trực tiếp được kiểm tra server/DB, bao gồm closed scopes còn quyền. Không phụ thuộc workspace memberMode hoặc directory chỉ dành cho department leader.
- [x] Query last-three sessions đúng group/term, `session_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, nằm trong ngày membership của thành viên; JOIN attendance theo member và session.
- [x] Lấy ba sessions gần nhất trước khi filter attendance status; sau đó chỉ giữ member có cả ba `absent`. Không filter `absent` trước LIMIT 3 vì sẽ nối những buổi vắng không liên tiếp.
- [x] Exclude người inactive/transferred/archived và member mới chưa có ba buổi; missing/excused/present ngắt chuỗi. Session hôm nay/tương lai và ministry/department sessions không tham gia.
- [x] Loại gợi ý đã có open/in_progress case. Sau khi bất kỳ case `group_absence` cùng member/group/term đã resolve, chỉ tính ba buổi mới hoàn toàn sau ngày resolve gần nhất theo múi giờ hội thánh; áp dụng cả case manual/attendance. Không dùng lại buổi vắng trong thời gian case cũ còn mở.
- [x] Read-list không chứa notes hoặc note preview; query theo quyền trước pagination/count/search. Read-detail chỉ gọi note query nếu `care_can_read_notes` true; trả `notes: []` khi chỉ có quyền metadata.
- [x] Confirmation RPC tính lại gợi ý sau khi lock member/scope và kiểm tra term active; nếu không còn điều kiện trả structured domain error. Tạo case/evidence trong cùng transaction, xử lý unique-index conflict bằng lỗi `duplicate`.
- [x] Source evidence do server xây dựng dưới dạng `{sessions: [{id, date, status: "absent"}], latestSessionDate}`; JSON được validate tại RPC, client không được ghi đè.
- [x] Scope lookup trả tên thành viên/nhóm tối thiểu cần thiết bằng RPC đã xác thực; không mở rộng projection `member_profile_public` cho mọi portal user chỉ để phục vụ Care.
- [x] Áp migrations local theo AGENTS; regenerate database types từ toàn bộ schema local bằng Supabase CLI. Nếu generator tạo diff metadata không liên quan, chỉ lấy các table/RPC blocks Care từ output đã sinh vào file hiện có; không viết tay signatures hoặc ghi đè contract các feature khác.

**Acceptance:** Không false positive với gaps/excused/timezone/new members; server chống confirm stale và duplicate; source evidence không bị ghi đè bởi client.

Thứ tự tính điều kiện phải tương đương predicate sau; dùng SQL window/lateral query để tính trong database, không tải toàn bộ lịch sử về client:

```ts
type AttendanceEvidence = {
  id: string;
  date: string;
  status: "present" | "absent" | "excused" | null;
};
function hasAbsenceSuggestion(latestThree: AttendanceEvidence[]): boolean {
  return (
    latestThree.length === 3 &&
    latestThree.every((row) => row.status === "absent")
  );
}
// latestThree must already be scoped to group/term and the membership period,
// before today, after the latest resolved case date, ordered newest first.
```

## Task 4: Server feature contract, Zod và URL state

**Files:** Create `src/features/care/{types,schemas,search-params,queries,actions}.ts`.

**Interfaces:**

- Consumes: generated types + RPC contracts Task 2/3, `requirePortalContext`, server `createClient`.
- Produces: `getCareScopes()`, `getCareList(ministrySlug, termSlug, filters)`, `getCareDetail(ministrySlug, termSlug, careSlug)`; actions `createCareFollowUpAction`, `updateCareFollowUpAction`, `assignCareFollowUpAction`, `addCareNoteAction`.

```ts
export type CareStatus = "open" | "in_progress" | "resolved";
export type CareTab = "open" | "suggestions" | "history";
export type CareFilters = {
  groupSlug: string | null;
  tab: CareTab;
  page: number;
  q: string;
};
export type CareActionResult =
  | { success: true; caseId?: string }
  | {
      success: false;
      code:
        | "validation"
        | "forbidden"
        | "duplicate"
        | "stale"
        | "closed"
        | "unknown";
      error: string;
      fieldErrors?: Record<string, string[]>;
    };
export type CareCreateInput = {
  groupId: string;
  memberId: string;
  assigneeId: string;
  nextContactDate: string | null;
  source: "manual" | "attendance";
};
```

- [x] Define typed DTOs for metadata, source snapshot, note, scope and detail matching JSON Task 3; note text never part of list DTO.
- [x] Zod: IDs là UUID, status enum, page positive integer, note trim length 1–4000, query length tối đa 100, date string `YYYY-MM-DD` thực sự hợp lệ hoặc null. Không tin client `canUpdate`, role hay term lifecycle.
- [x] `queries.ts` có `server-only`; guard portal rồi resolve ministry/term/group/case theo scope server và slug. Không query note trước khi quyền đã được kiểm tra.
- [x] `actions.ts` có `use server`; mọi export action là async, guard + Zod + RPC tương ứng. `createCareFollowUpAction` chọn RPC thủ công hoặc attendance theo source.
- [x] Map error codes sang English messages: duplicate → `An open follow-up already exists.`; stale → `Attendance has changed. Refresh the suggestions.`; closed → `This term is read-only.`; forbidden → `You do not have access to this follow-up.`; unknown → `Unable to save changes. Please try again.`
- [x] Sau mutation revalidate chỉ các Care paths tương ứng, không gửi note trong result/action logs. Không gọi broad refresh/query để preload mọi ghi chú.
- [x] URL state `tab`, `group`, `page`, `q` dùng `nuqs` server parsing; group route khóa group từ path, không cho query string đổi scope.

**Acceptance:** Form invalid không gọi RPC, direct action vẫn kiểm tra auth; forbidden/stale/duplicate có structured errors không lộ database details.

## Task 5: Danh sách, gợi ý, chi tiết và route loading

**Files:** Create bốn components Care trong file map; create routes dưới đây và `loading.tsx` tương ứng:

```text
src/app/portal/care/page.tsx
src/app/portal/care/loading.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/page.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/loading.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/[careSlug]/page.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/[careSlug]/loading.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/groups/[groupSlug]/care/page.tsx
src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/groups/[groupSlug]/care/loading.tsx
```

**Interfaces:**

- Consumes: Care DTOs/queries/actions Task 4 và shared UI components.
- Produces: `CareList`, `CareDetail`, `CareEditor`, `CareListSkeleton`, `CareDetailSkeleton`; các route chỉ resolve params/searchParams rồi render cùng feature components.

- [x] `/portal/care` có scope cards; zero-scope có empty state không lộ tên nhóm/term ngoài quyền; một scope auto redirect; nhiều scopes chọn term. Closed scopes hiển thị `Read-only`.
- [x] List `Open` gộp open/in_progress, sort overdue rồi next-contact date rồi created_at; `History` chứa resolved. Ở closed term, cả hai tab giữ dữ liệu nhưng không có mutation controls/Suggestions.
- [x] List card chỉ có tên member/group, status, assignee và next-contact date; không note preview. Search tên member trong scope, filter group cho commissioner, pagination chia sẻ pageSize 20.
- [x] Suggestions card hiển thị ba ngày/buổi vắng và action `Create follow-up`; confirm drawer chọn assignee/ngày. Không tự tạo case khi mở tab.
- [x] Create manual drawer chọn member active của group; leader assignee cố định chính mình, commissioner dùng option picker cho chính mình/trưởng nhóm group.
- [x] Detail có metadata, căn cứ vắng và timeline notes khi `canReadNotes`; user chỉ có metadata không được nhận note payload. Tạo note hiển thị tác giả/ngày; append-only.
- [x] Editor thao tác `Start follow-up`, đổi next-contact date, `Resolve`, `Assign`; controls chỉ render theo returned permissions. RPC vẫn kiểm tra dù UI đang stale.
- [x] Mở detail từ list bằng `ResponsiveEditor` với bottom drawer mobile, dùng cùng `CareDetail` ở route deep link. URL case slug có thể copy và mở lại; deep link mobile vẫn có view đọc toàn trang, các thao tác mở bottom drawer.
- [x] Drawer footer `Cancel`/`Save`/`Done` cố định có safe area; date dùng custom DatePicker; assignee/member options `min-h-14 rounded-xl`. Reuse `AdminPageHeader`, tabs, member avatar, skeleton primitive thay vì tạo design system mới.
- [x] Khi đổi route/filter dùng route skeleton; mutation pending giữ nội dung và disable action. Không thay toàn bộ timeline bằng skeleton trong lúc save note.

**Acceptance:** cùng một dữ liệu/permissions cho group và term view; deep link không vượt scope; mobile 320 px không overflow và drawer có footer rõ ràng.

## Task 6: Portal entry point và kiểm tra nghiệm thu local

**Files:** Modify `src/components/portal/{portal-header,portal-sidebar}.tsx`; Create `docs/care-acceptance.md`.

**Interfaces:**

- Consumes: `getCareScopes()`; passing prop `canAccessCare: boolean` từ PortalHeader tới PortalSidebar.
- Produces: link `Care` → `/portal/care` cho user có scope, bao gồm commissioner chưa có department workspace; chứng cứ local cho ma trận dưới đây.

- [x] Header query Care scopes phía server; thêm link Care theo quyền. Không đổi broad memberMode để cấp quyền Care cho member, không suy quyền từ tên workspace.
- [x] Commissioner chỉ có term role vẫn nhìn thấy link Care và truy cập scope, không cần gán thêm department leader. Trưởng nhóm thấy Care của nhóm đúng term; giữ route quay về `/portal`.
- [x] Viết checklist local theo ma trận; dùng hai nhóm cùng term, một nhóm term khác, hai churches, commissioner, hai group leaders, ordinary member, admin-only.
- [x] Test meaningful DB authorization/integrity bằng transaction local có rollback và authenticated claims, không reset database. Kiểm tra cả SELECT trực tiếp bảng/notes và EXECUTE trực tiếp RPC; chứng cứ UI không thay thế database denial.
- [x] Chạy targeted regression cho suggestion sequences và concurrency bằng local fixtures không chứa dữ liệu thật; package hiện không có `test` script nên không giả định `pnpm test:authorization` tồn tại. Không thêm test framework chung chỉ cho feature này; có thể dùng SQL transaction checks hoặc test runner chuẩn Node cho isolated fixture assertions.
- [x] Kiểm tra browser mobile 320 px/desktop: create manual, confirm suggestion, assign, add-note, overdue, resolve, role revoke, closed history; không gửi email thật.
- [x] Khi người dùng yêu cầu commit, chạy đúng bốn quality gates trong AGENTS, rà diff và stage đúng feature paths. Chỉ commit/push nếu đã được yêu cầu.

### Ma trận chứng cứ

| Kịch bản                                                                     | Kết quả cần có                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Absent, Absent, Absent` ở ba buổi hợp lệ gần nhất                           | Có một suggestion                                           |
| `Absent, Excused, Absent`; `Absent, Present, Absent`; `Absent, null, Absent` | Không suggestion                                            |
| Ba Absents trước joined_at hoặc nhóm khác; buổi hôm nay/tương lai            | Không suggestion                                            |
| Member inactive/transferred/archived                                         | Không suggestion/tạo mới                                    |
| Attendance sửa ngay trước confirm                                            | RPC từ chối stale                                           |
| Hai confirm đồng thời cùng member/group/term                                 | Một case; lần còn lại trả duplicate                         |
| Resolve rồi mở Suggestions khi chưa có ba buổi vắng mới                      | Không tái tạo gợi ý cũ                                      |
| Group leader đọc note case giao cho commissioner/người khác                  | Bị từ chối; list metadata không có note preview             |
| Commissioner đọc case/notes term khác; member/admin-only truy cập trực tiếp  | Bị từ chối                                                  |
| Đổi assignee/thu hồi role/archive người được giao                            | Người cũ mất quyền note ngay                                |
| Case/member/group IDs khác term/church hoặc sửa immutable fields             | Mutation bị từ chối                                         |
| Nhiệm kỳ closed, case vẫn open                                               | Chỉ đọc; không assign/add note/resolve, không tự copy       |
| Legacy case group-null/author-null                                           | Giữ nguyên; chỉ commissioner đúng term đọc, tác giả unknown |
| Note content trong list payload/audit/header                                 | Không có                                                    |
| Mobile drawer, date/member picker và loading                                 | Đúng shared patterns và không overflow                      |

## Bàn giao

Plan hoàn thành khi feature đã được triển khai và từng kết quả acceptance có chứng cứ local. Ghi riêng gates chưa chạy nếu chưa được yêu cầu commit; không gọi build thành công là chứng cứ quyền truy cập hoặc hành vi UI.

Đã triển khai và nghiệm thu local; chứng cứ chi tiết tại `docs/care-acceptance.md`. Bốn quality gates đã exit 0 ngày 2026-10-09 theo yêu cầu commit; lint còn một warning có sẵn trong Calendar. Không push hoặc áp migration hosted.
