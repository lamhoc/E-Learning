# Hướng dẫn Deploy E-Learning LHU trên Máy trạm (SQL Server 2019 + Link HTTPS Cố Định)

Kiến trúc triển khai này tận dụng toàn bộ CPU/RAM của máy trạm Windows, giữ **SQL Server 2019 (`127.0.0.1:1433`)** và **Next.js (`127.0.0.1:3000`)** hoàn toàn kín trong máy nội bộ, không mở bất kỳ port nào trên router, và public ra Internet bằng **đường link HTTPS cố định vĩnh viễn** qua **Tailscale Funnel** (hoặc **Cloudflare Named Tunnel** nếu gắn tên miền riêng).

---

## Đường link cố định (Tailscale Funnel — Mặc định)

- **Link HTTPS cố định**: `https://desktop-bbe9lgh.tail3de3b4.ts.net`
- Miễn phí 100%, không cần mua tên miền, không hiện trang cảnh báo, không bao giờ đổi link khi khởi động lại máy.
- Tailscale chạy ngầm sẵn như Windows Service và tự giữ cấu hình `tailscale funnel --bg 3000`.

### Vận hành hàng ngày (1-click)

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
   - Xác nhận Tailscale Funnel đang mở cổng `3000` và hiển thị link cố định `https://desktop-bbe9lgh.tail3de3b4.ts.net`.
3. Dừng Next.js server: nhấn `Ctrl + C` hoặc chạy `npm run deploy:stop`.
4. Nếu muốn tạm ngắt public ra Internet từ Tailscale Funnel:
   ```powershell
   & "C:\Program Files\Tailscale\tailscale.exe" funnel --https=443 off
   ```
   Bật lại:
   ```powershell
   & "C:\Program Files\Tailscale\tailscale.exe" funnel --bg 3000
   ```

---

## Tùy chọn mở rộng: Gắn tên miền riêng (.com / .id.vn) qua Cloudflare Tunnel

Nếu sau này mua tên miền riêng (ví dụ `https://elearning.tenmiencuaban.com`):

1. Tạo Tunnel miễn phí tại [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) -> **Networks** -> **Tunnels** -> trỏ Public Hostname về `http://127.0.0.1:3000`.
2. Thêm token vào `.env.local`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjo...
   ```
3. Chạy lại `start-deploy.bat` (script sẽ tự ưu tiên dùng Named Tunnel nếu có `CLOUDFLARE_TUNNEL_TOKEN`).

---

## Kiểm tra an toàn bảo mật

- **Tuyệt đối KHÔNG mở Port Forwarding `1433` hay `3000`** trên modem/router.
- SQL Server (`sa`) chỉ nhận kết nối nội bộ qua `127.0.0.1:1433`.
- Toàn bộ file upload lưu cục bộ tại `storage/uploads/` trên ổ cứng máy trạm và được bảo vệ bằng JWT cookie qua `/api/uploads/[...path]`.
