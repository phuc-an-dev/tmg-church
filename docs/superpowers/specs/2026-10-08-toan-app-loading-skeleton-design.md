# Thiết kế hoàn thiện skeleton toàn ứng dụng

## Bối cảnh

TMG Church có 33 route page nhưng chỉ 13 route `loading.tsx`. Loading UI hiện có tập trung ở admin; portal, nhiều trang xác thực và một số trang quản trị chưa có fallback theo đúng nội dung. Một số màn hình cũng tải lại dữ liệu trong client component mà không dùng skeleton theo bố cục nội dung.

Next.js 16 dùng `loading.tsx` làm Suspense boundary cho page và các route con. File này không bao phủ việc xử lý dữ liệu chạy trong layout cùng segment. Hai layout portal và admin hiện chờ dữ liệu truy cập/quản trị trước khi dựng header, vì vậy cần tính cả thời gian dựng shell khi thiết kế trạng thái tải.

## Mục tiêu

- Có phản hồi tải dễ hiểu ở mọi route người dùng truy cập và mọi lần chuyển route.
- Dùng skeleton bám bố cục trang đích để hạn chế layout shift; giữ shell đã tải ổn định khi nội dung route đang chờ.
- Bao phủ các lần tải lại dữ liệu tại chỗ như tìm kiếm, đổi trang và đổi bộ lọc nếu nội dung chính thực sự được thay bằng dữ liệu mới.
- Duy trì thiết kế mobile-first: danh sách dạng card trên màn hình nhỏ, khớp với bố cục thật và không tạo điều khiển tương tác giả.
- Tái sử dụng component skeleton sẵn có khi chúng khớp bố cục, chỉ bổ sung abstraction khi có ít nhất hai màn hình dùng chung cùng cấu trúc.

## Ngoài phạm vi

- Thay đổi truy vấn, quyền truy cập, cache lifetime hoặc hợp đồng dữ liệu.
- Dùng skeleton cho trạng thái mutation ngắn của nút lưu/xóa; các trạng thái đó tiếp tục dùng pending feedback tại điều khiển tương ứng.
- Tạo một bộ khung toàn trang đồng nhất thay cho skeleton đặc thù nội dung.
- Thay đổi nội dung, thiết kế hoặc hành vi của các màn hình khi dữ liệu đã tải.

## Thiết kế

### 1. Bản đồ loading theo route

Rà soát cả 33 page route, nhóm theo auth, portal và admin; ghi nhận page/layout nào chờ dữ liệu server, component nào tải dữ liệu ở client, và loading UI hiện hữu nào đã khớp. Bổ sung `loading.tsx` ở ranh giới route phù hợp. Ưu tiên skeleton đặc thù cho dashboard, danh sách/card, trang chi tiết, biểu mẫu xác thực và nội dung phiên sinh hoạt; dùng component skeleton chia sẻ hiện có ở các trang cùng bố cục.

### 2. Shell và server streaming

Giữ header/navigation dùng chung nhìn thấy được khi phần nội dung route chờ. Tách các thao tác đọc dữ liệu của layout có thể stream độc lập khỏi phần dựng shell; đặt Suspense boundary riêng với fallback khớp header khi cần. Không chuyển xác thực ra client, không bỏ `requirePortalContext`/`requireSystemAdmin`, và không để nội dung được bảo vệ lộ ra trước khi quyền truy cập được xác nhận.

### 3. Tải lại dữ liệu phía client

Rà soát tìm kiếm, bộ lọc, phân trang và tab tải dữ liệu mới. Giữ toolbar/điều hướng đang hoạt động; chỉ thay vùng dữ liệu bằng skeleton khớp card hoặc bảng của vùng đó trong lúc chờ. Nếu thao tác chỉ cập nhật trạng thái nhẹ hoặc giữ nguyên dữ liệu hiện tại, dùng pending feedback tại chỗ thay vì che nội dung bằng skeleton.

### 4. Quy ước hiển thị và trợ năng

Skeleton dùng component `Skeleton` chung, hỗ trợ `motion-reduce`, không giả lập chữ/nút có thể tương tác, và giữ kích thước gần với nội dung thật ở breakpoint nhỏ lẫn lớn. Không thay đổi font điều khiển biểu mẫu hoặc vùng chạm vì skeleton không phải điều khiển thao tác.

## Triển khai và xác nhận

1. Hoàn thiện kiểm kê route và trạng thái tải hiện có.
2. Bổ sung/chỉnh loading boundary và skeleton theo nhóm màn hình, ưu tiên portal và các route admin còn thiếu.
3. Cô lập vùng dữ liệu cần stream trong layout portal/admin nếu cần để fallback có thể xuất hiện trong lúc shell đang tải.
4. Bổ sung skeleton tại chỗ cho các luồng client refresh còn thiếu.
5. Rà soát route trên viewport mobile và desktop, kiểm tra chuyển route, lần tải dữ liệu đầu, tìm kiếm/phân trang/bộ lọc; kiểm tra thay đổi bằng `git diff` và `git diff --check`.

Không chạy bộ lint/typecheck/format/build trong giai đoạn thiết kế. Theo quy ước dự án, các lệnh chất lượng đó chỉ chạy sau khi người dùng yêu cầu commit.

## Tiêu chí hoàn thành

- Mọi page route trong app có loading fallback phù hợp ở ranh giới gần nhất có thể, hoặc được ghi rõ là không có tải bất đồng bộ để hiển thị.
- Chuyển từ một route sang route khác hiển thị skeleton bố cục đích khi nội dung chưa sẵn sàng; shell dùng chung không bị thay bằng skeleton toàn trang.
- Các vùng dữ liệu tải lại qua client có feedback phù hợp với phạm vi cập nhật.
- Skeleton danh sách tuân theo cách trình bày responsive của dữ liệu thật.
- Xác thực và kiểm soát truy cập phía server vẫn chặn dữ liệu bảo vệ trong suốt quá trình tải.
