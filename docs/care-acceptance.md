# Nghiệm thu Care local

## Phạm vi

Care dành cho trưởng nhóm và ủy viên thăm viếng và chăm sóc đúng nhiệm kỳ. Người dùng tạo việc thủ công hoặc xác nhận gợi ý sau ba buổi nhóm vắng liên tiếp. Ghi chú chỉ dành cho người được giao còn quyền và ủy viên nhiệm kỳ; nhiệm kỳ đóng giữ lịch sử chỉ đọc.

## Chứng cứ database và server

- Ba migration `20261009000000`–`20261009000002` đã được đọc và áp thành công trên Supabase local bằng `psql`, không reset dữ liệu.
- `supabase/tests/care-follow-up.sql`: **80 assertions thành công**, chạy trong transaction và `ROLLBACK`. Agent triển khai và agent chính đều đã chạy thành công.
- Ma trận gồm hai nhóm cùng nhiệm kỳ, nhóm ở nhiệm kỳ khác, hai churches, commissioner, hai trưởng nhóm, member và admin-only. Kiểm tra RPC lẫn SELECT trực tiếp theo authenticated claims.
- Đã kiểm tra: ba Absents; Excused/Present/thiếu attendance ngắt chuỗi; trước ngày gia nhập; inactive/transferred/archived; hôm nay/tương lai; stale confirmation; unique open case; resolve không dùng lại chuỗi cũ; note privacy sau đổi assignee/thu hồi role/archive; closed/draft; khác church/term; legacy null; immutable fields; audit không có nội dung note.
- Hai kết nối độc lập tạo thủ công đồng thời: giao dịch thứ hai chờ **3.85 giây**, nhận `duplicate`; chỉ một case mở được lưu trong fixture riêng.
- Hai kết nối xác nhận suggestion đồng thời: giao dịch thứ hai chờ **3.86 giây**, nhận `duplicate`; chỉ một case attendance được tạo. Case giả này đã dọn để kiểm tra UI xác nhận suggestion độc lập.
- Chín assertions Zod trực tiếp thành công: ngày nhuận/ngày không tồn tại/định dạng/null, giới hạn page, note trắng và giới hạn 4000 ký tự.
- Review database và server không có finding nghiêm trọng. Advisory page quá lớn đã xử lý bằng giới hạn page 1.000.000 để không overflow offset SQL của trang web.

## Chứng cứ giao diện

Đã nghiệm thu browser với dữ liệu giả trên localhost; không gửi email:

- Trưởng nhóm: link Care; tạo thủ công; xác nhận suggestion và suggestion biến mất; lazy detail và deep link; thêm note có tác giả/thời gian; Start; chọn ngày bằng custom DatePicker và lưu thành công.
- Ủy viên chỉ có role nhiệm kỳ, không có department leader: Care vẫn có trong sidebar ngay cả khi portal ở member mode; đọc note và phân công lại cho chính mình.
- Đăng nhập lại trưởng nhóm sau phân công: còn metadata nhưng note và nút Add note đều có count 0. Đổi role fixture từ leader sang member: deep link trả Page not found. Khôi phục role fixture sau kiểm tra.
- Resolve bằng UI: case sang History; Suggestions không dùng lại ba buổi vắng cũ.
- Search và group filter thực sự đổi dữ liệu; URL page 2 khi còn hai case tự hiển thị dữ liệu trang hợp lệ thay vì danh sách trắng.
- Nhiệm kỳ đóng: vẫn thấy các case mở và resolved, giữ note đã có; không có Create/Suggestions/Start/Assign/Add note/Resolve. Kiểm tra cả term view lẫn group route.
- Chiều rộng CSS thực tế 320 px (browser có scale, đã xác nhận bằng DOM): scrollWidth = clientWidth = 320. Drawer sát đáy 800 px, footer nằm ở đáy; Close/Clear date/Cancel/Save có kích thước danh nghĩa 44 px, option cards 56 px. Desktop CSS 1280 px không overflow và dùng shared desktop dialog.
- Quan sát route loading và pending mutation giữ nội dung, disable controls; search trên Suggestions được ẩn vì RPC không hỗ trợ search ở tab này.

## Review và dọn fixture

- Ba vòng review triển khai: database, server, UI/portal; các lỗi chức năng đã được sửa và rà lại. Lượt rà soát mobile độc lập bổ sung còn các vấn đề được ghi tại `docs/care-ui-review.md`, gồm vùng chạm của Calendar/back link, nhãn trợ năng, retry tải options và giữ ngữ cảnh điều hướng. Các chỉnh sửa UI sau đó đã dùng Label chung, khóa Group của trưởng nhóm, dùng MemberAssignDrawer, nút tạo nổi và giảm spacing drawer chung.
- Đã sửa lỗi refetch sau save có thể dẫn đến retry note trùng: editor đóng sau mutation thành công, lỗi tải lại có thông báo riêng và chỉ retry thao tác đọc. Nhánh mất kết nối này được review source; chưa mô phỏng lỗi mạng trên browser.
- Đã clamp/refetch page quá cuối, tăng vùng chạm Clear date trong Care, và dùng skeleton phần thẻ khi đổi filter để không lặp header.
- Fixture browser đã được dọn chỉ theo IDs giả: ministry, term, group, membership, attendance, audit, note/case và tài khoản local. Kiểm tra lại fixture ministry/term/profile/user đều 0; Care case/note trở về 0 như trước nghiệm thu.
- Viewport đã reset, tài khoản fixture đã logout. Migration/schema Care được giữ lại để sử dụng app.

## Giới hạn bàn giao

Ngày 2026-10-09, sau yêu cầu commit: `pnpm lint`, `pnpm typecheck`, `pnpm format:check` và `pnpm build` đều exit 0. Lint còn một warning có sẵn về dependencies của effect trong `src/components/ui/calendar.tsx:162`; không có lint error. Đã sửa hai dấu nháy JSX và định dạng lại các tài liệu Care. Chưa push hoặc áp migration lên hosted Supabase.
