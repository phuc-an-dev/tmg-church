# Hướng dẫn dành cho Coding Agent — TMG Church

## Giao diện ưu tiên thiết bị di động (Mobile-first UI)

Luôn thiết kế và kiểm thử bắt đầu từ màn hình nhỏ nhất trở lên.

- Các điều khiển biểu mẫu (form controls) phải từ 16 px trở lên trên mobile.
- Vùng chạm (touch targets) tối thiểu 44 x 44 px.
- Không sử dụng thẻ mặc định của trình duyệt (ví dụ: select input calendar,...).
- Trên mobile, hiển thị danh sách dạng thẻ (card). Mở các tác vụ tạo mới, chỉnh sửa, chi tiết, bộ lọc và xác nhận trong ngăn kéo đáy (bottom drawer). Tuyệt đối không dùng modal/dialog căn giữa trên mobile.
- Tái sử dụng lại component để giao diện được đồng bộ

## Tác vụ huỷ hoại dữ liệu (Destructive actions)

- Sử dụng `DestructiveActionButton` từ `@/components/shared/item-action-buttons` cho mọi nút kích hoạt tác vụ nguy hiểm: Delete, Archive, Leave, Remove, Unassign, và Deactivate.

## Các quy tắc bất khả xâm phạm

- Ngôn ngữ: Tài liệu dự án (`README.md`, `AGENTS.md`) viết bằng tiếng Việt. Mã nguồn (code), tên file, tên biến/hàm, chú thích (comments), log, UI copy, metadata, nhãn trợ năng (accessible labels) và nội dung email xác thực giữ tiếng Anh.
- Sử dụng thương hiệu `TMG Church`, Lucide icons qua thư viện `lucide-react`, không dùng emoji hoặc icon ký tự Unicode trên giao diện.
- Sử dụng Next.js App Router, Supabase và `@supabase/ssr`; không bổ sung backend riêng biệt hay service-role key.
- Ưu tiên Server Components cho các thao tác đọc dữ liệu và Server Actions cho các mutation đã xác thực. Giữ quyền truy cập Supabase trong các module query hoặc mutation ở phía server.
- Xác thực mọi mutation bằng Zod và trả về lỗi có cấu trúc, không để lộ lỗi thô từ cơ sở dữ liệu.

## Tư duy Ponytail (Lazy senior dev mode)

Áp dụng tư duy Ponytail vào logic, mutation, query và tái cấu trúc mã:

- **Chế độ mặc định**: `full` (tối giản mã nguồn nghiêm ngặt); hỗ trợ `ultra` (triệt để tuân thủ YAGNI) khi được yêu cầu.
- **Chiếc thang Ponytail (The Ladder)**: Dừng lại ở bậc đầu tiên giải quyết được vấn đề: 1. Có thực sự cần tồn tại không (YAGNI)? $\to$ 2. Tái sử dụng utils/components sẵn có $\to$ 3. Dùng chuẩn Web/JS/TS stdlib $\to$ 4. Dùng dependencies đã cài đặt $\to$ 5. Viết gọn trong một dòng $\to$ 6. Tạo diff hoạt động nhỏ nhất có thể.

## Quy trình bàn giao (Delivery)

- Trước khi bàn giao, bắt buộc chạy:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```
