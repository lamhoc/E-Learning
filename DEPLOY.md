# Hướng dẫn Deploy E-Learning LHU trên Máy trạm (SQL Server 2019 + Cloudflare Tunnel)

Kiến trúc triển khai này tận dụng toàn bộ CPU/RAM của máy trạm Windows, giữ **SQL Server 2019 (`127.0.0.1:1433`)** và **Next.js (`127.0.0.1:3000`)** hoàn toàn kín trong máy nội bộ, không mở bất kỳ port nào trên router, và đưa web ra Internet qua **HTTPS tự động của Cloudflare Tunnel**.

---

## Cách 1: Chạy Public ngay lập tức (1-click, miễn phí, không cần tên miền)

1. Nhấp đúp file **`start-deploy.bat`** ở thư mục gốc dự án, hoặc mở PowerShell tại thư mục dự án chạy:
   ```powershell
   npm run deploy:local
   ```
   *(Nếu vừa sửa code và muốn build lại bản Production trước khi chạy)*:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/deploy-workstation.ps1 -Rebuild
   ```
2. Script sẽ tự động:
   - Kiểm tra dịch vụ `MSSQLSERVER` đang chạy.
   - Khởi động Next.js Production tại `http://127.0.0.1:3000`.
   - Mở Cloudflare Tunnel và in ra đường dẫn public HTTPS dạng:
     `https://<ten-ngau-nhien>.trycloudflare.com` (đồng thời lưu vào file `deploy-url.txt`).
3. Để dừng hệ thống: nhấn `Ctrl + C` trong cửa sổ đang chạy, hoặc chạy:
   ```powershell
   npm run deploy:stop
   ```

---

## Cách 2: Gắn tên miền cố định & tự chạy ngầm khi bật Windows (Cloudflare Zero Trust)

Khi muốn có đường link cố định vĩnh viễn (ví dụ `https://elearning.tenmiencuaban.com`) và không đổi link mỗi lần khởi động lại:

1. Đăng nhập miễn phí [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) -> **Networks** -> **Tunnels** -> **Create a tunnel** -> chọn **Cloudflared**.
2. Đặt tên tunnel (ví dụ `elearning-workstation`), copy chuỗi token (`eyJhIjo...`).
3. Trong mục **Public Hostname** của tunnel vừa tạo:
   - Subdomain / Domain: chọn tên miền của bạn.
   - Service Type: `HTTP`
   - URL: `127.0.0.1:3000`
4. Mở file `.env.local` và thêm 1 dòng:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjo...
   ```
5. Chạy lại `start-deploy.bat` (hoặc `npm run deploy:local`): script sẽ tự động nhận `CLOUDFLARE_TUNNEL_TOKEN` và kết nối vào tên miền cố định của bạn.

---

## Kiểm tra an toàn bảo mật

- **Tuyệt đối KHÔNG mở Port Forwarding `1433`** trên modem/router ra ngoài Internet.
- Tài khoản `sa` chỉ kết nối nội bộ qua `127.0.0.1:1433`.
- Toàn bộ file upload (tài liệu học tập, bài tập sinh viên) được lưu cục bộ tại `storage/uploads/` trên ổ cứng máy trạm và được bảo vệ bởi JWT cookie khi tải qua `/api/uploads/[...path]`.
- Dữ liệu quan trọng nên sao lưu định kỳ thư mục `storage/uploads/` và backup database `AutoBankELearning` trong SQL Server Management Studio (SSMS).
