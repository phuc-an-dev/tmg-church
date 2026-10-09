# Rà soát giao diện Care

Ngày: 2026-10-08. Người rà soát độc lập, không sử dụng kết luận của lượt review trước.

## Phạm vi và căn cứ

Đọc `AGENTS.md`, thiết kế đã duyệt `docs/superpowers/specs/2026-10-08-care-follow-up-design.md`, bốn component Care, tám route page/loading mới và diff header/sidebar Portal. Đối chiếu mã thực tế của `AdminPageHeader`, `ResponsiveEditor`, `ActionFooter`, `OptionPickerSheet`, `MemberAvatar`, `NavigationTabs`, `PaginationCard`, `DatePicker`, `Calendar`, `Button`, `Input`; các luồng Portal group/session/member, ministry và session editor hiện có.

Đã xem ảnh `care-mobile.jpg`, `care-drawer-mobile.jpg`, `care-desktop.jpg` trong thư mục `/Users/phamtrinhanphuc/.codex/visualizations/2026/10/08/01a11b8b-662b-7d53-9094-c9324913e77a/`. Ảnh thể hiện trang chi tiết, drawer chi tiết lồng drawer sửa ngày và trạng thái chỉ đọc desktop. Không dùng ảnh làm bằng chứng kích thước CSS vì quá trình chụp có scale/crop.

## Findings — theo mức độ

### 1. [P2] Lịch chưa đáp ứng vùng chạm 44 × 44 px trên mobile

- Vị trí Care: `src/features/care/components/care-editor.tsx:298–305`.
- Nguyên nhân dùng chung: `src/components/ui/calendar.tsx:447`, `:793`, `:100`.
- Calendar đặt `--cell-size:2.25rem` dưới 400 px và `2.5rem` từ 400 đến 639 px; nút ngày lấy chính kích thước này cho size/min-height/min-width. Với cỡ chữ gốc 16 px, vùng chọn ngày tương ứng 36 hoặc 40 px. Nút chọn tháng/năm mobile dùng `py-1 text-sm` và không có chiều cao tối thiểu 44 px. Vì vậy người dùng Care trên 320 px phải chạm các vùng nhỏ hơn quy định để lên lịch liên hệ.
- Care đã bổ sung selector bảo đảm nút trực tiếp của DatePicker, gồm nút xóa ngày, đạt 44 px. Selector đó không áp dụng đến lịch trong portal của Sheet. Tái sử dụng DatePicker là đúng mẫu của session editor, nhưng không tự bảo đảm mọi vùng chạm bên trong.
- Hướng sửa: sửa kích thước và bố cục mobile của Calendar dùng chung, tính cả chiều rộng bảy cột ở 320 px; tránh chỉ tăng nút ngày rồi gây tràn ngang. Đây là lỗi kế thừa của component chung, không phải hồi quy chỉ có ở Care.
- Bằng chứng: mã nguồn; chưa đo trực tiếp từng ô lịch ở runtime trong lượt này.

### 2. [P2] Nút quay lại vẫn có vùng chạm thấp hơn 44 px

- Vị trí: `src/features/care/components/care-list.tsx:88`; `src/app/portal/care/page.tsx:18`; `src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/[careSlug]/page.tsx:18–21`.
- Nguyên nhân: `src/components/admin/admin-page-header.tsx:26–32` dựng Link bằng `inline-flex text-sm` nhưng không có padding hoặc min-height. Với line-height mặc định, chiều cao theo nội dung khoảng 20 px. Người dùng phải chạm một đường chữ nhỏ để rời trang trên mobile.
- Header này cũng được dùng trong Portal group/session. Giao diện thống nhất về hình thức nhưng vẫn kế thừa lỗi đối với quy định vùng chạm; các nút đóng drawer và phân trang hiện có đã dùng 44 px.
- Hướng sửa: bổ sung vùng chạm vào back link của header chung, giữ kiểu chữ và biểu tượng hiện tại.
- Bằng chứng: mã nguồn; không khẳng định đã đo hitbox runtime.

### 3. [P2] Bộ chọn thiếu liên kết giữa nhãn trường và nút mở

- Vị trí: `src/features/care/components/care-editor.tsx:50–63`.
- `Group`, `Member`, `Assignee` được hiển thị bằng span độc lập; Button không có `aria-label` hay `aria-labelledby`. Khi đã có giá trị, accessible name chỉ là tên nhóm hoặc người. Với cùng một người được chọn làm Member và Assignee, người dùng trình đọc màn hình nghe hai nút cùng tên mà không biết vai trò của từng trường. Placeholder chỉ giúp khi trường chưa chọn.
- Đối chiếu: `src/features/ministry/components/ministry-management.tsx:295–299` đặt nhãn `Lifecycle: ${activeLabel}` cho nút chọn; DatePicker cũng nhận nhãn rõ ràng từ Care. Các trường Input trong session editor liên kết Label/id.
- Hướng sửa: liên kết nhãn bằng id/aria-labelledby và mô tả giá trị, hoặc thêm accessible name gồm cả tên trường và giá trị. Có thể bổ sung aria-expanded để công bố trạng thái drawer.
- Bằng chứng: mã nguồn; chưa chạy trình đọc màn hình.

### 4. [P2] Không thể thử lại tại chỗ khi tải lựa chọn thất bại

- Vị trí: `src/features/care/components/care-editor.tsx:114–139`, `:184–189`, `:343–347`.
- Khi `loadCareGroupOptionsAction` lỗi tạm thời, options giữ null, Member/Assignee và Save bị vô hiệu hóa. Effect chỉ chạy lại khi groupId/mode thay đổi; phần lỗi chỉ in thông báo “Please try again” mà không có thao tác Retry. Luồng tạo từ gợi ý, nhóm cố định và Assign không có bộ chọn nhóm để kích hoạt tải lại. Người dùng buộc phải đóng/mở drawer và nhập lại dữ liệu nháp.
- Đối chiếu: Care detail loader đã cung cấp Retry tại `care-list.tsx:334–340`; lỗi refresh chi tiết có `Refresh follow-up` tại `care-detail.tsx:164–172`; root error của app cũng có `Try again`.
- Hướng sửa: cho phép tải lại cùng nhóm ngay trong drawer, giữ ngày và dữ liệu nháp; không thêm hệ thống retry tự động hoặc abstraction mới.
- Bằng chứng: nhánh lỗi và dependency effect trong mã nguồn; chưa giả lập lỗi mạng runtime.

### 5. [P3] Đi qua trang chi tiết làm mất ngữ cảnh danh sách

- Vị trí: `src/features/care/components/care-list.tsx:348`; `src/app/portal/ministries/[ministrySlug]/terms/[termSlug]/care/[careSlug]/page.tsx:19`.
- `Open follow-up page` luôn đi sang route chi tiết cấp nhiệm kỳ, không giữ route nhóm hoặc query tab/group/q/page. Back link luôn trở về danh sách nhiệm kỳ mặc định Open. Ví dụ người dùng mở việc đã giải quyết từ History của một nhóm rồi bấm Care sẽ về Open của nhiệm kỳ và phải tìm lại nhóm/tab.
- Đối chiếu: `src/features/portal/member-session-detail.tsx:17–20` đã chọn URL quay lại theo `fromAssignments`, giữ phần Portal tương ứng với điểm vào.
- Hướng sửa: giữ điểm quay lại hợp lệ cho thao tác mở từ danh sách; deep link trực tiếp vẫn có thể dùng Care của nhiệm kỳ làm mặc định. Không dùng giá trị return URL chưa kiểm tra.
- Bằng chứng: URL được dựng trong mã nguồn; chưa bấm lại luồng trong browser.

## Ma trận mobile-first và tính thống nhất

| Hạng mục                      | 320–399 px                                                | 400–767 px                                          | Desktop         | Kết luận/căn cứ                                                                                           |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Danh sách                     | Card một cột                                              | Hai cột từ 640 px                                   | Hai cột         | Có min-w-0, tên dài break-words; không xác nhận lỗi tràn ngang                                            |
| Control Care                  | Search, textarea, picker trigger dùng text-base           | Giữ text-base; DatePicker dùng sm:text-sm từ 640 px | Kiểu dùng chung | DatePicker 640–767 px còn 14 px dù ResponsiveEditor vẫn coi là mobile; lỗi kế thừa cần sửa cùng finding 1 |
| Nút chính, footer, phân trang | Min-height 44 px                                          | Min-height 44 px                                    | Cùng component  | Đạt theo mã; ngoại lệ back link và lịch ở findings 1–2                                                    |
| Option card                   | min-h-14, rounded-xl                                      | Cùng mẫu                                            | Vẫn mở Sheet    | Đạt theo mã OptionPickerSheet; chưa kiểm chứng tên cực dài                                                |
| Tạo/sửa/chi tiết/xác nhận     | Bottom Sheet dưới 768 px                                  | Bottom Sheet dưới 768 px                            | Dialog          | Đúng ResponsiveEditor; ảnh drawer lồng thể hiện đúng dạng                                                 |
| Footer drawer                 | Body cuộn riêng, footer shrink-0                          | Cùng mẫu                                            | ActionFooter    | Có safe-area ở editor, option picker, lịch và tháng/năm; chưa kiểm tra bàn phím iPhone                    |
| Loading/error/pending         | Skeleton list/detail, disable lúc Save, alert khi lỗi     | Cùng luồng                                          | Cùng luồng      | Có trạng thái; options thiếu Retry như finding 4                                                          |
| Empty/read-only               | Thông báo tiếng Anh, card/read-only banner                | Cùng luồng                                          | Cùng luồng      | EmptyState tự viết khác mẫu chung; không coi khác hình thức đơn thuần là lỗi chức năng                    |
| Avatar/tabs/màu/typography    | Dùng token, shared avatar và tabs                         | Cùng mẫu                                            | Cùng mẫu        | Không thấy emoji/native select/native date input trong Care                                               |
| Điều hướng                    | Có Portal/Care và entry sidebar có kiểm tra scope         | Cùng luồng                                          | Cùng luồng      | Sidebar active theo /care; mất ngữ cảnh khi đi qua detail như finding 5                                   |
| Ngày                          | ISO date-only giữ nguyên; thời gian theo Asia/Ho_Chi_Minh | Cùng cách xử lý                                     | Cùng cách xử lý | Không thấy lỗi chuyển UTC làm lệch ngày; không đặt giới hạn cấm ngày quá khứ vì spec không yêu cầu        |

## Giới hạn có ảnh hưởng đến kết luận

- Chỉ review; không sửa source, chạy dev server, thao tác tab người dùng, đăng nhập, áp migration hoặc tạo fixture. Không chạy lint/typecheck/format:check/build hay test.
- Số đo DOM do agent chính cung cấp: danh sách tại CSS 320 px có scrollWidth bằng clientWidth 320; drawer có left 0/right 320/bottom 800; footer/nút khoảng 44 px và option khoảng 56 px (có sai số làm tròn). Đây là bằng chứng được chuyển giao, không phải phép đo mới của người rà soát này. Không suy ra overflow từ mép ảnh bị cắt.
- Chưa kiểm chứng focus restore khi đóng các overlay lồng, VoiceOver, thao tác Escape/tab, bàn phím ảo, landscape hoặc dữ liệu tên/ghi chú cực dài. Không nâng những rủi ro này thành lỗi đã tái hiện.
- Các phát hiện về component chung được ghi rõ là lỗi kế thừa. Bản báo cáo không yêu cầu thay toàn bộ thiết kế hay đổi các mẫu đã được phê duyệt.
