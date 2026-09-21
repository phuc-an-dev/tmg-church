# Test thủ công Auth và Portal — TMG Church

**Môi trường:** production (`https://tmgchurch.website`)

**Cách test:** mobile-first. Chạy lượt chính ở viewport mobile nhỏ nhất, sau đó smoke test lại trên desktop.

**Ngày:** ____________________ **Người test:** ____________________

## Tài khoản và dữ liệu test

Sử dụng các tài khoản test thật theo nhãn dưới đây. Không ghi password, invitation token hoặc recovery link vào tài liệu.

| Nhãn     | Cấu hình cần có                                        |
| -------- | ------------------------------------------------------ |
| MA       | `master_admin` của Church production                   |
| ADMIN    | `admin` của Church production                          |
| MH       | Ministry Head trong Ministry Term `active`             |
| DL       | Department Leader/commissioner đúng Department và Term |
| GL       | Group Leader trong Group `active`                      |
| DGL      | Deputy Leader trong cùng Group                         |
| BSL      | Bible Study Leader trong cùng Group                    |
| MEMBER   | Đã enroll vào Term active, không có operational role   |
| OUTSIDER | Member ngoài scope hoặc chưa enroll vào target         |
| CLOSED   | Term closed có dữ liệu lịch sử                         |
| DRAFT    | Term draft có assignment đã chuẩn bị, nếu có           |

Ghi lại slug thực tế:

- Ministry: `____________________`
- Active Term: `____________________`
- Department A: `____________________`
- Department B: `____________________`
- Group A: `____________________`
- Group B: `____________________`
- Test session: `____________________`

## Quy tắc thực hiện

- Mỗi case bắt đầu bằng cửa sổ private/incognito mới hoặc sign out trước khi đổi persona.
- Kiểm tra URL sau mỗi lần điều hướng; với case deny phải thử cả direct URL.
- Case destructive chỉ dùng session/request/assignment/member test và khôi phục nếu có thể.
- Khi fail, chụp màn hình và ghi URL, persona, thời điểm, kết quả hiển thị.
- Điền các cột `Kết quả thực tế`, `Trạng thái`, `Bằng chứng` ngay khi test.

Trạng thái: `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`.

## P0 — Authentication và ranh giới route

| ID       | Persona                                  | Điều kiện và bước test                                                          | Kết quả mong đợi                                                                  | Kết quả / trạng thái / bằng chứng |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| AUTH-001 | Anonymous                                | Mở trực tiếp `/admin`.                                                          | Redirect đến `/admin/login`; không thấy dữ liệu admin.                            |                                   |
| AUTH-002 | Anonymous                                | Mở trực tiếp `/portal`.                                                         | Bị từ chối/redirect; không thấy dữ liệu member.                                   |                                   |
| AUTH-003 | MEMBER                                   | Đăng nhập email/password, mở `/portal`.                                         | Portal tải thành công; chỉ thấy các surface được phép.                            |                                   |
| AUTH-004 | MEMBER                                   | Mở trực tiếp `/admin`.                                                          | Bị từ chối; không lộ dữ liệu quản trị.                                            |                                   |
| AUTH-005 | MA                                       | Đăng nhập, mở `/admin`.                                                         | Admin shell và quản lý Church/Ministry hoạt động.                                 |                                   |
| AUTH-006 | ADMIN                                    | Đăng nhập, mở `/admin`.                                                         | Admin shell hoạt động; quản lý system role vẫn chỉ dành cho MA.                   |                                   |
| AUTH-007 | User đã xác thực nhưng chưa link profile | Mở `/portal` và `/admin`.                                                       | Cả hai đều bị từ chối.                                                            |                                   |
| AUTH-008 | Mọi persona                              | Sign out, dùng Back rồi refresh trang protected.                                | Session không được khôi phục; dữ liệu vẫn bị bảo vệ.                              |                                   |
| AUTH-009 | Invitee                                  | Dùng invitation hợp lệ một lần, đặt password, đăng nhập, mở lại activation URL. | Activation lần đầu thành công; replay bị từ chối; password sign-in vẫn dùng được. |                                   |
| AUTH-010 | Invitee                                  | Dùng invitation expired/revoked/superseded.                                     | Bị từ chối với lỗi an toàn; không tạo link sai.                                   |                                   |

## P0 — Ma trận capability

Chạy từng dòng với active Term và scope tương ứng. `Allow` là hoàn thành được; `Deny` là bị từ chối và không lộ dữ liệu.

| ID      | Persona  | Portal của mình     | Đọc Group               | Quản lý member Group  | Session/attendance Group | Đọc Department          | Quản lý member Department | Quản lý service role    | Duyệt request Department             |
| ------- | -------- | ------------------- | ----------------------- | --------------------- | ------------------------ | ----------------------- | ------------------------- | ----------------------- | ------------------------------------ |
| CAP-001 | MA       | Allow               | Allow                   | Allow                 | Allow                    | Allow                   | Allow                     | Allow                   | Allow                                |
| CAP-002 | ADMIN    | Allow               | Allow                   | Allow                 | Allow                    | Allow                   | Allow                     | Allow                   | Allow                                |
| CAP-003 | MH       | Allow               | Chỉ scope được phép     | Chỉ khi có assignment | Chỉ khi có assignment    | Allow trong active Term | Allow trong active Term   | Allow trong active Term | Allow trong active Term              |
| CAP-004 | DL       | Allow               | Deny nếu không được gán | Deny                  | Deny                     | Allow đúng Department   | Allow đúng Department     | Allow đúng Department   | Allow đúng Department                |
| CAP-005 | GL       | Allow               | Allow Group của mình    | Allow Group của mình  | Allow Group của mình     | Deny                    | Deny                      | Deny                    | Deny                                 |
| CAP-006 | DGL      | Allow               | Allow Group của mình    | Allow Group của mình  | Chỉ đọc lịch sử          | Deny                    | Deny                      | Deny                    | Deny                                 |
| CAP-007 | BSL      | Allow               | Chỉ đọc Group của mình  | Deny                  | Chỉ đọc lịch sử          | Deny                    | Deny                      | Deny                    | Deny                                 |
| CAP-008 | MEMBER   | Allow               | Chỉ scope được hiển thị | Deny                  | Deny ghi dữ liệu         | Chỉ đọc target/request  | Deny                      | Deny                    | Chỉ submit/withdraw request của mình |
| CAP-009 | OUTSIDER | Chỉ portal của mình | Deny                    | Deny                  | Deny                     | Deny                    | Deny                      | Deny                    | Deny                                 |

## P0 — Các route Portal mới

Thay placeholder bằng slug thực tế đã ghi ở trên.

| ID        | Route                                                                               | Persona                   | Kết quả mong đợi                                                         |
| --------- | ----------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| ROUTE-001 | `/portal`                                                                           | Member đã link            | Portal shell chỉ hiện card đúng quyền.                                   |
| ROUTE-002 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/members`                 | GL, DGL, BSL, MA, ADMIN   | Directory đúng Group/Term; người khác bị deny hoặc kết quả an toàn rỗng. |
| ROUTE-003 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/sessions`                | GL, DGL, BSL, MA, ADMIN   | Session list đúng Group/Term.                                            |
| ROUTE-004 | `/portal/ministries/{ministry}/terms/{term}/groups/{group}/sessions/{session}`      | GL, DGL, BSL, MA, ADMIN   | Session detail/attendance đúng Group.                                    |
| ROUTE-005 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/members`       | DL, MH, MA, ADMIN         | Department directory đúng Department active.                             |
| ROUTE-006 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/requests`      | MEMBER, DL, MH, MA, ADMIN | Member có request flow; authority có queue quyết định.                   |
| ROUTE-007 | `/portal/ministries/{ministry}/terms/{term}/departments/{department}/service-roles` | DL, MH, MA, ADMIN         | Người có quyền quản lý role/assignment; người khác bị deny.              |
| ROUTE-008 | `/admin/church/advanced`                                                            | MA, ADMIN                 | System role/invitation controls tải; chỉ MA đổi Admin assignment.        |
| ROUTE-009 | `/admin/ministries/{ministry}/terms/{term}`                                         | MA, ADMIN                 | Members, Ministry roles, sessions, lifecycle tải đúng.                   |
| ROUTE-010 | `/admin/ministries/{ministry}/terms/{term}/groups/{group}`                          | MA, ADMIN                 | Group members và leadership management hoạt động.                        |
| ROUTE-011 | `/admin/ministries/{ministry}/terms/{term}/departments/{department}`                | MA, ADMIN                 | Department members và service-role administration hoạt động.             |

## P1 — Test Group workflow

| ID        | Persona      | Bước test                                                   | Kết quả mong đợi                                             |
| --------- | ------------ | ----------------------------------------------------------- | ------------------------------------------------------------ |
| GROUP-001 | GL           | Tạo session trong Group active của mình.                    | Session được tạo và chỉ hiện trong Group/Term đó.            |
| GROUP-002 | GL           | Sửa session, ghi attendance, lưu.                           | Dữ liệu lưu; attendance chỉ áp dụng cho member Group active. |
| GROUP-003 | GL           | Xóa disposable session rỗng.                                | Session bị xóa sau confirmation.                             |
| GROUP-004 | DGL          | Mở session/attendance history, thử create/edit/delete.      | Đọc được; mọi mutation bị deny.                              |
| GROUP-005 | BSL          | Mở history và thử mutation bằng direct URL/action.          | Đọc được; mutation bị deny.                                  |
| GROUP-006 | GL/DGL       | Assign rồi unassign regular member trong Group.             | Thành công trong đúng Group; không xóa leadership role.      |
| GROUP-007 | GL           | Assign member khác Term hoặc chuyển member khỏi Group khác. | Bị deny; membership cũ không đổi.                            |
| GROUP-008 | GL           | Đổi URL sang Group B.                                       | Read/write bị deny; không lộ dữ liệu Group B.                |
| GROUP-009 | DRAFT/CLOSED | Thử tạo/sửa/xóa session hoặc attendance.                    | Lifecycle gate từ chối mutation, kể cả MA/ADMIN khi áp dụng. |

## P1 — Test Department member và request

| ID       | Persona | Bước test                                | Kết quả mong đợi                                                            |
| -------- | ------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| DEPT-001 | MEMBER  | Mở request Department A và submit.       | Tạo pending request cho đúng member/Department.                             |
| DEPT-002 | MEMBER  | Refresh/reopen trang request.            | Chỉ thấy request của mình; không thấy request/người/reason của member khác. |
| DEPT-003 | MEMBER  | Withdraw pending request.                | Thành withdrawn; có thể submit lại sau đó.                                  |
| DEPT-004 | MEMBER  | Submit khi chưa enroll vào Term.         | Action/RPC bị deny.                                                         |
| DEPT-005 | MEMBER  | Submit lần hai khi còn pending.          | Duplicate pending request bị reject.                                        |
| DEPT-006 | DL      | Mở queue Department A.                   | Authority đúng Department thấy request pending và thông tin an toàn.        |
| DEPT-007 | DL      | Approve pending request.                 | Request approved và tạo đúng một Department assignment.                     |
| DEPT-008 | DL      | Reject không nhập reason.                | Request rejected và có fallback reason không rỗng.                          |
| DEPT-009 | MEMBER  | Submit lại sau rejection.                | Tạo pending request mới.                                                    |
| DEPT-010 | DL      | Quyết định request của Department B.     | Bị deny; request không đổi.                                                 |
| DEPT-011 | DL      | Assign/remove member trong Department A. | Chỉ thành công ở đúng active Department.                                    |
| DEPT-012 | DL      | Assign member khác Term/Department.      | Bị deny.                                                                    |
| DEPT-013 | MEMBER  | Đổi slug sang Department B.              | Chỉ thấy thông tin target an toàn; không lộ private queue.                  |

## P1 — Test Department service-role

| ID          | Persona | Bước test                                                     | Kết quả mong đợi                                                       |
| ----------- | ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SERVICE-001 | DL      | Tạo service role trong Department A.                          | Role xuất hiện trong catalog.                                          |
| SERVICE-002 | DL      | Đổi tên disposable service role.                              | Tên đổi; role không bị chuyển Department.                              |
| SERVICE-003 | DL      | Tạo session Department A, chọn role/member và assign.         | Assignment thành công khi session, role, member, Term/Department khớp. |
| SERVICE-004 | DL      | Remove assignment.                                            | Assignment bị xóa; role/member vẫn còn.                                |
| SERVICE-005 | DL      | Assign role A vào session Department B.                       | RPC bị reject.                                                         |
| SERVICE-006 | DL      | Assign vào session không có Department hoặc member khác Term. | RPC bị reject.                                                         |
| SERVICE-007 | DL      | Xóa role còn assignment.                                      | Bị reject; assignment vẫn còn.                                         |
| SERVICE-008 | GL      | Mở route service-role và gọi action trực tiếp.                | Bị deny; GL không có capability Department service-role.               |
| SERVICE-009 | MEMBER  | Mở route service-role trực tiếp.                              | Bị deny; không lộ role/assignment private.                             |

## P1 — Test Admin role management

| ID       | Persona  | Bước test                                              | Kết quả mong đợi                                             |
| -------- | -------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| ROLE-001 | MA       | Add/remove ADMIN trong Church Advanced.                | Capability Admin đổi ngay; MA vẫn được bảo vệ.               |
| ROLE-002 | ADMIN    | Thử add/remove Admin hoặc đổi Master Admin.            | Bị deny.                                                     |
| ROLE-003 | MA/ADMIN | Assign/remove từng Ministry role trong active Term.    | Một seat/role; capability xuất hiện/mất ngay.                |
| ROLE-004 | MA/ADMIN | Reassign Ministry role sang member khác.               | Assignment cũ được thay thế atomic; không có duplicate seat. |
| ROLE-005 | MA/ADMIN | Assign role cho member ngoài Term.                     | Bị deny.                                                     |
| ROLE-006 | MA/ADMIN | Chuẩn bị role trong draft Term.                        | Assignment lưu được nhưng chưa có operational capability.    |
| ROLE-007 | MA/ADMIN | Sửa role assignment trong closed Term.                 | Bị deny; lịch sử vẫn đọc được.                               |
| ROLE-008 | MA/ADMIN | Assign/remove GL, DGL, BSL trong Group administration. | Constraint leadership đúng; không tạo duplicate active seat. |

## P1 — Test lifecycle và revoke quyền

| ID       | Persona     | Bước test                                                | Kết quả mong đợi                                        |
| -------- | ----------- | -------------------------------------------------------- | ------------------------------------------------------- |
| LIFE-001 | Role holder | Gỡ role bằng session admin khác, refresh rồi thử action. | Quyền mất ngay theo database; action bị deny.           |
| LIFE-002 | MA/ADMIN    | Chuyển Term draft sang active.                           | Assignment chuẩn bị trước đó mới có hiệu lực.           |
| LIFE-003 | MA/ADMIN    | Đóng active Term.                                        | Operational write dừng; historical read còn.            |
| LIFE-004 | Role holder | Reopen closed Term hoặc sửa dữ liệu closed.              | Bị deny.                                                |
| LIFE-005 | Mọi persona | Đổi URL từ active Term A sang draft/closed Term B.       | Rule áp dụng theo Term đích, không theo trang hiện tại. |

## P1 — Test bypass Data API và RPC

Dùng authenticated session hoặc API client đã chuẩn bị. Chỉ ghi HTTP status/error code, không ghi access token.

| ID      | Persona   | Thử trực tiếp                                                      | Kết quả mong đợi                                                          |
| ------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| API-001 | BSL       | Insert/update/delete Group session/attendance.                     | Bị deny (`42501` hoặc tương đương); không đổi row.                        |
| API-002 | GL        | Ghi session/roster/attendance của Group khác.                      | Bị deny bởi scope RLS/RPC.                                                |
| API-003 | MEMBER    | Insert/update/delete trực tiếp `department_join_request`.          | Bị deny; submit/withdraw chỉ qua RPC.                                     |
| API-004 | MEMBER    | Gọi `portal_decide_department_request`.                            | Bị deny vì thiếu `department.members.manage`.                             |
| API-005 | DL        | Gọi service-assignment RPC với Department/session/Term không khớp. | Bị deny; không tạo assignment.                                            |
| API-006 | OUTSIDER  | Select private Department/Group projection.                        | Empty/deny; không lộ phone, Auth ID, private note hoặc dữ liệu protected. |
| API-007 | Anonymous | Gọi protected RPC không có session.                                | Bị deny; không lộ lỗi nhạy cảm.                                           |
| API-008 | ADMIN     | Ghi trực tiếp system role tables bằng authenticated client.        | Bị deny; hierarchy RPC vẫn bắt buộc.                                      |

## P2 — UI và usability regression

| ID     | Persona | Kiểm tra                                     | Kết quả mong đợi                                                  |
| ------ | ------- | -------------------------------------------- | ----------------------------------------------------------------- |
| UI-001 | Tất cả  | Chạy flow chính ở mobile width.              | Không horizontal overflow; card dễ đọc; control đủ lớn để chạm.   |
| UI-002 | Tất cả  | Mở create/edit/detail/confirmation.          | Mobile dùng bottom drawer/sheet, không dùng centered modal.       |
| UI-003 | Tất cả  | Điều hướng bằng keyboard trên desktop.       | Focus rõ; link/button đi tới được; không phụ thuộc native select. |
| UI-004 | Tất cả  | Kích hoạt validation, empty, loading, error. | Dễ hiểu; không lộ raw DB error hoặc secret.                       |
| UI-005 | Tất cả  | Back/Forward và refresh deep route.          | Scope và route đúng; không lộ content trái quyền lúc loading.     |
| UI-006 | Tất cả  | Kiểm tra dark mode và tên tiếng Việt dài.    | Text dễ đọc; layout không vỡ.                                     |

## Điều kiện đạt

- Tất cả case P0 phải `PASS`.
- Case P1 áp dụng phải `PASS` hoặc có blocker được ghi nhận và duyệt.
- Không persona trái quyền nào đọc/ghi được qua direct URL, Server Action, RPC hoặc Data API.
- Không lộ phone, Auth user ID, invitation token, private note hoặc protected field.
- Mọi lỗi production có screenshot, URL, persona, timestamp và mô tả tái hiện được.

## Tổng kết

- P0 pass: `____ / ____`
- P1 pass: `____ / ____`
- P2 pass: `____ / ____`
- Case fail: `____________________________________________`
- Case blocked: `___________________________________________`
- Issue/commit follow-up: `__________________________________`
