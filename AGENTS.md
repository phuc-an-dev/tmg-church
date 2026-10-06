# Hướng dẫn dành cho Coding Agent — TMG Church

## Giao diện ưu tiên thiết bị di động (Mobile-first UI)

Luôn thiết kế và kiểm thử bắt đầu từ màn hình nhỏ nhất trở lên.

- Các điều khiển biểu mẫu (form controls) phải từ 16 px trở lên trên mobile.
- Vùng chạm (touch targets) tối thiểu 44 x 44 px.
- Không sử dụng thẻ mặc định của trình duyệt (ví dụ: select input calendar,...).
- Trên mobile, hiển thị danh sách dạng thẻ (card). Mở các tác vụ tạo mới, chỉnh sửa, chi tiết, bộ lọc và xác nhận trong ngăn kéo đáy (bottom drawer). Tuyệt đối không dùng modal/dialog căn giữa trên mobile.
- Các item trong danh sách lựa chọn (list items / option cards) trong bottom drawer phải đảm bảo chiều cao tối thiểu `min-h-14` (56 px) và bo góc `rounded-xl`.
- Mọi bottom drawer phải có thanh hành động cố định ở đáy (sticky bottom footer) hỗ trợ `env(safe-area-inset-bottom)` với ít nhất 1 nút (`Cancel` / `Done`) hoặc nhóm nút (`Cancel & Save`, `Clear & Cancel`,...); vùng chạm mỗi nút tối thiểu 44 x 44 px.
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

## Database và email local

### Áp migration local

- Đọc migration trước khi chạy. Không dùng `supabase db reset` trừ khi người dùng yêu cầu vì lệnh này xoá dữ liệu local.
- Chạy đúng migration mới bằng lệnh sau, thay `<migration-file.sql>` bằng file cần áp dụng:

```bash
docker exec -i supabase_db_tmg-church psql -v ON_ERROR_STOP=1 -U postgres -d postgres < supabase/migrations/<migration-file.sql>
```

- Xác nhận lệnh không lỗi rồi kiểm tra lại luồng bị ảnh hưởng.

### Test email local

- Mặc định không cấu hình `RESEND_API_KEY` hoặc `RESEND_FROM_EMAIL` khi test invitation local để tránh gửi email thật. Khi các biến này được đặt, invitation local sẽ gửi email thật qua Resend.
- Chạy `pnpm dev`, gửi invitation trong app và mở activation link được in ở console dev server khi chưa cấu hình Resend. Link có hiệu lực 15 phút.
- Email do Supabase Auth tạo có thể xem tại `http://127.0.0.1:54324` khi Supabase local đang chạy.

### Test trên iPhone

- Chạy `pnpm dev`, rồi mở tunnel tạm bằng `ngrok http 3000 --url https://decoy-baggie-stand.ngrok-free.dev` và truy cập URL đó trên iPhone.

## Quy trình bàn giao (Delivery)

- Chỉ chạy các lệnh kiểm tra chất lượng sau khi người dùng yêu cầu commit:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
