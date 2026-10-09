# Care — thiết kế theo dõi việc hỏi thăm thành viên

## Mục tiêu và người dùng

Giúp trưởng nhóm và ủy viên thăm viếng và chăm sóc biết thành viên nào cần được hỏi thăm, ai đang phụ trách và việc liên hệ đã tiến triển đến đâu. Phạm vi bản đầu tiên là việc hỏi thăm người vắng sinh hoạt nhóm; hồ sơ thuộc nhóm và nhiệm kỳ cụ thể.

Người dùng đã chốt các quyết định sau:

- Trưởng nhóm và ủy viên thăm viếng và chăm sóc là người dùng trực tiếp.
- Tạo việc thủ công hoặc xác nhận gợi ý từ điểm danh.
- Gợi ý sau ba buổi sinh hoạt nhóm vắng liên tiếp đã diễn ra và có điểm danh.
- Ghi chú chỉ dành cho người được giao và ủy viên điều phối của nhiệm kỳ đó.
- Khi nhiệm kỳ kết thúc, việc chưa hoàn tất giữ trong lịch sử nhiệm kỳ cũ. Khi cần, tạo việc mới thủ công; không tự chuyển việc sang nhiệm kỳ mới.

## Căn cứ từ repository

- `care_flag` và `care_note` đã tồn tại trong migration đầu tiên và `src/types/database.ts`, nhưng chưa có feature Care hay route Care.
- `care_flag` hiện gắn với thành viên và nhiệm kỳ; chưa có nhóm, người được giao, trạng thái hoặc ngày hỏi thăm tiếp.
- `care_note` hiện chỉ có nội dung và thời gian; chưa có tác giả.
- Policy hiện tại cho system admin truy cập cả hai bảng. Policy này cần thay để đáp ứng giới hạn người đọc ghi chú đã chốt.
- Vai trò `visitation_care_commissioner` đã tồn tại trong `term_role_assignment`; trưởng nhóm là `group_leader` trong `term_group_membership`.
- Điểm danh có `present`, `absent`, `excused`; không có thao tác chốt điểm danh hay trạng thái hoàn tất/cancel của buổi nhóm.
- Portal context đã có thành viên hiện tại, vai trò nhóm và vai trò nhiệm kỳ. Không cần thêm vai trò hoặc hệ thống xác thực mới.

## Luồng sử dụng

1. Trưởng nhóm mở Care của nhóm; ủy viên mở Care của nhiệm kỳ và lọc theo nhóm.
2. Tab `Suggestions` trình bày tên thành viên và ba buổi vắng làm căn cứ. Gợi ý là kết quả đọc, không phải hồ sơ đã được tạo.
3. Chọn `Create follow-up` hoặc tạo thủ công từ danh sách thành viên trong nhóm.
4. Chọn người phụ trách và ngày liên hệ tiếp theo. Trưởng nhóm mặc định tự nhận; ủy viên có thể giao cho trưởng nhóm tương ứng hoặc tự nhận.
5. Người phụ trách thêm ghi chú, cập nhật ngày liên hệ và chuyển `Open` → `In progress` → `Resolved`.
6. Việc quá ngày liên hệ được gắn nhãn `Overdue`; đây là nhãn tính toán, không thêm trạng thái database.
7. Tab `History` hiển thị việc đã giải quyết. Care của nhiệm kỳ `closed` là chỉ đọc, kể cả việc vẫn còn `Open` hoặc `In progress`.

Ghi chú không xuất hiện trên card, kết quả tìm kiếm, badge, audit payload hoặc export. Chỉ tải ghi chú sau khi server xác nhận quyền đọc chi tiết.

## Quy tắc gợi ý vắng liên tiếp

- Chỉ dùng session có `term_group_id` đúng nhóm và thuộc đúng nhiệm kỳ.
- Chỉ dùng ngày trước ngày hiện tại theo `Asia/Ho_Chi_Minh`. Schema chỉ lưu ngày, nên chưa dùng buổi diễn ra trong ngày hôm nay để tránh coi buổi chưa diễn ra là đã qua.
- Với thành viên đang active trong nhóm, xét các buổi nằm trong khoảng thành viên tham gia nhóm; không dùng lịch trước ngày tham gia hoặc lịch nhóm cũ.
- Xét ba buổi nhóm gần nhất theo `session_date DESC, id DESC`. Cả ba phải có bản ghi `Absent` rõ ràng của thành viên. `Present`, `Excused` hoặc thiếu bản ghi sẽ ngắt chuỗi; không bỏ qua bản ghi thiếu để nối những lần vắng xa nhau.
- Gợi ý xuất hiện khi người dùng mở/refetch trang; không thêm cron, worker hoặc gửi thông báo.
- Nếu đã có việc chưa giải quyết cùng thành viên/nhóm/nhiệm kỳ cho `group_absence`, không gợi ý tạo trùng.
- Sau khi một việc `group_absence` đã được giải quyết, cả ba buổi của gợi ý tiếp theo phải diễn ra sau ngày giải quyết theo múi giờ hội thánh, áp dụng cả việc thủ công và việc từ điểm danh. Không tái dùng các buổi vắng trong thời gian việc cũ đang được xử lý.
- Khi xác nhận gợi ý, RPC tính lại điều kiện bằng dữ liệu server; không tin session IDs hoặc tên thành viên do client gửi.
- Điểm danh được sửa sau khi tạo việc không xóa hồ sơ hoặc ghi chú. Căn cứ gợi ý được lưu dưới dạng snapshot tối thiểu của ba session IDs, ngày và trạng thái tại lúc tạo.

## Phân quyền

| Người dùng                                                  | Danh sách/gợi ý                              | Tạo việc                          | Phân công                                     | Ghi chú                                   | Lịch sử nhiệm kỳ đóng                                             |
| ----------------------------------------------------------- | -------------------------------------------- | --------------------------------- | --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Trưởng nhóm còn quyền trong nhóm                            | Metadata việc của nhóm mình                  | Trong nhóm mình, mặc định tự nhận | Không chuyển người; yêu cầu ủy viên điều phối | Chỉ việc đang được giao cho mình          | Chỉ đọc trong phạm vi còn quyền; ghi chú vẫn theo người được giao |
| Ủy viên thăm viếng và chăm sóc                              | Tất cả nhóm trong nhiệm kỳ được giao vai trò | Trong các nhóm của nhiệm kỳ       | Giao cho trưởng nhóm đúng nhóm hoặc tự nhận   | Đọc/thêm ghi chú trong nhiệm kỳ được giao | Chỉ đọc trong nhiệm kỳ còn được giao vai trò                      |
| Admin, trưởng mục vụ, trưởng ban khác, nhóm phó, thành viên | Không có quyền Care tự động                  | Không                             | Không                                         | Không                                     | Không                                                             |

Admin vẫn quản lý các vai trò thông qua màn hình hiện có. Admin chỉ dùng Care khi đồng thời có vai trò Care hợp lệ; không giữ bypass admin cho ghi chú.

Quyền người được giao cần kiểm tra cả `assignee_member_profile_id` và vai trò hiện hành. Thu hồi vai trò, chấm dứt tư cách trưởng nhóm hoặc archive hồ sơ phải thu hồi quyền ngay. Một việc còn tên người phụ trách cũ không tự cấp quyền lâu dài cho người đó.

Care hoạt động trong nhiệm kỳ `active`; `draft` không tạo việc/gợi ý, `closed` chỉ đọc. Lịch sử thuộc nhiệm kỳ cũ, không tự cấp quyền cho người phụ trách ở nhiệm kỳ mới. Nếu cần tiếp tục chăm sóc, mở việc mới thủ công và tự ghi nội dung phù hợp.

## Dữ liệu và integrity

Tái sử dụng hai bảng hiện có:

- `care_flag`: bổ sung `term_group_id`, `assignee_member_profile_id`, `status`, `next_contact_date`, `created_by_member_profile_id`, `resolved_at`, `resolved_by_member_profile_id`, `source` và `source_evidence`.
- `source`: `manual` hoặc `attendance`; `flag_type` cho luồng mới dùng `group_absence`.
- `source_evidence`: snapshot ba buổi làm căn cứ; rỗng cho việc tạo thủ công. Snapshot không chứa tên, số điện thoại hoặc ghi chú.
- `care_note`: bổ sung `author_member_profile_id`. Ghi chú mới là append-only trong MVP; không thêm edit/delete note.
- Ràng buộc group thuộc đúng term, member có membership đúng term/group tại lúc tạo và assignee có vai trò phù hợp; term/member/group/source của việc không được sửa sau khi tạo.
- Một partial unique index bảo đảm tối đa một việc `Open`/`In progress` cùng member/term/group/flag type. RPC tạo/phân công/cập nhật phải xử lý race bằng transaction và row locks.
- Trạng thái `Resolved` có thời gian/người giải quyết; không có hard delete hay tự reopen trong MVP. Có thể tạo việc mới nếu phát sinh nhu cầu mới.

Dữ liệu cũ có thể thiếu nhóm hoặc tác giả. Giữ nguyên, không suy luận tác giả từ admin hiện tại hoặc nhóm hiện tại của thành viên. Các cột mới nullable để migration không phá dữ liệu; RPC mới bắt buộc đầy đủ thông tin. Bản ghi cũ chưa xác định nhóm chỉ ủy viên đúng nhiệm kỳ được xem, không tham gia gợi ý; ghi chú cũ hiển thị `Unknown author`.

## Giao diện

- Entry point chung `/portal/care`: danh sách nhiệm kỳ Care mà người dùng có quyền; tự đi vào nhiệm kỳ nếu chỉ có một. Danh sách bao gồm lịch sử còn quyền truy cập.
- Trang `/portal/ministries/[ministrySlug]/terms/[termSlug]/care`: `Open`, `Suggestions`, `History`; ủy viên có bộ lọc nhóm.
- Route nhóm `/portal/ministries/[ministrySlug]/terms/[termSlug]/groups/[groupSlug]/care`: cùng component với scope nhóm cố định.
- Route `/portal/ministries/[ministrySlug]/terms/[termSlug]/care/[careSlug]`: deep link chi tiết; dùng UUID của case cho RPC, dùng slug trên URL.
- Tạo mới, phân công, ghi chú và ngày liên hệ mở bottom drawer trên mobile; chi tiết cũng mở bottom drawer từ danh sách và có route trực tiếp khi mở deep link.
- Card mobile, filter drawer, sticky footer có safe area, nút ít nhất 44 × 44 px, controls 16 px, option card `min-h-14 rounded-xl`.
- Dùng component hiện có: `ResponsiveEditor`, `MemberAvatar`, `NavigationTabs`, `OptionPickerSheet`, `DatePicker`, `PaginationCard`, `StatusToast`, `Skeleton`, Lucide icons. Không dùng native select/date input.
- Có skeleton riêng cho danh sách và chi tiết; empty, error, forbidden và read-only states dùng tiếng Anh.

## Phạm vi MVP

Bao gồm tạo thủ công, gợi ý điểm danh, giao người, ghi chú, lịch sử, ngày liên hệ tiếp theo, quyền đọc server/RLS và audit thao tác chỉ chứa IDs/action/status.

Ngoài MVP: thành viên tự gửi yêu cầu, cầu nguyện, SMS/email/push, export Care, file đính kèm, điểm số rủi ro, chuyển nhiệm kỳ, xóa ghi chú, dashboard thống kê mới và cron.

## Điều kiện nghiệm thu

- Ba bản ghi `Absent` liên tiếp trong đúng nhóm mới có gợi ý; `Excused`, `Present`, thiếu bản ghi, thành viên mới, buổi hôm nay/tương lai và nhóm khác đều không tạo false positive.
- Hai lần xác nhận đồng thời tạo tối đa một việc; đóng việc không lập lại gợi ý từ ba buổi cũ.
- Người ngoài scope hoặc admin không có vai trò Care không đọc được ghi chú qua route, Server Action hay Supabase API trực tiếp.
- Phân công và thu hồi vai trò làm quyền ghi chú thay đổi ngay, không phụ thuộc UI có ẩn nút hay không.
- Term `closed` không nhận mutation; việc chưa xong giữ trạng thái và dữ liệu trong lịch sử, không copy sang term mới.
- Mobile 320 px và desktop hoạt động cùng bộ component, drawer có footer và không overflow.

Tài liệu này chỉ xác định thiết kế đã chốt và các mặc định kỹ thuật; chưa triển khai code hoặc áp migration.
