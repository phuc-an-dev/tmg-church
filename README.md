# TMG Church

TMG Church là ứng dụng quản lý thông tin hội thánh ưu tiên thiết bị di động (mobile-first)

## Công nghệ sử dụng (Tech Stack)

- Next.js App Router với TypeScript
- React và Tailwind CSS
- shadcn/ui với các primitive của Radix
- Lucide icons
- Supabase Postgres, Auth, Row Level Security (RLS) và `@supabase/ssr`
- `nuqs` để quản lý trạng thái query URL
- React Hook Form và Zod cho biểu mẫu và xác thực dữ liệu
- TanStack Table cho bảng quản trị trên màn hình máy tính (desktop)
- Triển khai trên Vercel
- pnpm

## Cài đặt môi trường cục bộ (Local Setup)

Yêu cầu hệ thống:

- Node.js 22.13 trở lên
- pnpm 11 trở lên

Cài đặt dependencies và tạo file môi trường cục bộ:

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Ứng dụng sẽ chạy tại địa chỉ `http://localhost:3000`.

## Biến môi trường (Environment Variables)

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Chỉ đặt các thông tin publishable dùng trên trình duyệt vào biến `NEXT_PUBLIC_*`. Tuyệt đối không thêm `SUPABASE_SERVICE_ROLE_KEY` vào ứng dụng này hoặc để lộ cho trình duyệt.

## Các câu lệnh thường dùng (Commands)

```bash
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

## Phạm vi hiện tại (Current Scope)

Quản lý cốt lõi Hội thánh và Ban ngành, vòng đời thành viên, phân quyền RBAC, contextual sessions và cổng thông tin theo năng lực (`/portal`) dành cho các vai trò lãnh đạo đã hoàn thành. Thông báo và lịch trình công khai tạm thời hiển thị dưới dạng placeholder cho đến khi các module tương ứng được kích hoạt.
