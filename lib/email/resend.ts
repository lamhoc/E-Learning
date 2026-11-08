import 'server-only';

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Cấu hình Resend API
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Cấu hình Gmail / SMTP
const smtpUser = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
// Mật khẩu ứng dụng Google thường gồm 16 ký tự, có thể có khoảng trắng ở giữa (ví dụ: "abcd efgh ijkl mnop")
const smtpPass = (process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim())?.replace(/\s+/g, '');

/**
 * Khởi tạo Gmail / SMTP Transporter khi có cấu hình
 */
function getSmtpTransporter() {
  if (!smtpUser || !smtpPass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Xác định địa chỉ người gửi chuẩn nhận diện LHU
 */
function getSenderAddress(): string {
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim() || process.env.SMTP_FROM?.trim();

  // Nếu sử dụng Gmail SMTP, email gửi bắt buộc phải khớp với tài khoản Gmail đã xác thực
  if (smtpUser && smtpPass) {
    if (configuredFrom && configuredFrom.includes('<') && configuredFrom.includes('>')) {
      const displayName = configuredFrom.split('<')[0].trim();
      return `${displayName} <${smtpUser}>`;
    }
    return `Đại học Lạc Hồng <${smtpUser}>`;
  }

  return configuredFrom || 'LHU E-Learning <onboarding@resend.dev>';
}

/**
 * Kiểm tra hệ thống email (Resend hoặc Gmail SMTP) đã được cấu hình hay chưa
 */
export function isEmailConfigured(): boolean {
  return Boolean((smtpUser && smtpPass) || resendApiKey);
}

export function isResendConfigured(): boolean {
  return isEmailConfigured();
}

/**
 * Lấy URL gốc của ứng dụng web cho link và ảnh trong email
 */
function getEmailSiteUrl(): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/**
 * Tạo khung HTML Email responsive chuẩn nhận diện Đại học Lạc Hồng (LHU)
 * Màu chủ đạo: Xanh LHU (#154C99 / #0A275C) & Vàng Gold (#FACC15 / #EAB308)
 */
function createEmailTemplate({
  title,
  preheader,
  contentHtml,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
}) {
  const siteUrl = getEmailSiteUrl();
  const logoUrl = `${siteUrl}/logo-lhu.png`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0A275C 0%, #154C99 50%, #0F3D8A 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .logo-container {
      margin-bottom: 16px;
    }
    .logo-card {
      display: inline-block;
      background-color: #ffffff;
      padding: 10px 20px;
      border-radius: 14px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }
    .logo-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #ffffff;
      margin-bottom: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .subbadge {
      font-size: 11px;
      font-weight: 700;
      color: #FACC15;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .content {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
    }
    .otp-box {
      margin: 28px 0;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #154C99;
      display: inline-block;
      padding: 8px 16px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .btn {
      display: inline-block;
      background: #154C99;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(21, 76, 153, 0.2);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo-card">
            <img
              src="${logoUrl}"
              alt="Trường Đại học Lạc Hồng - Powered by Arizona State University"
              width="160"
              style="display: block; max-width: 170px; height: auto; border: 0;"
            />
          </div>
        </div>
        <div class="logo-badge">HỆ THỐNG E-LEARNING LHU</div>
        <div class="subbadge">⚡ POWERED BY ARIZONA STATE UNIVERSITY</div>
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px; font-weight: 700; color: #1e293b; font-size: 13px;">TRƯỜNG ĐẠI HỌC LẠC HỒNG (LHU)</p>
        <p style="margin: 0 0 6px;">Đây là email tự động từ Hệ thống Đào tạo & Khảo thí Trực tuyến Đại học Lạc Hồng.</p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">Số 10 Huỳnh Văn Nghệ, P. Bửu Long, TP. Biên Hòa, Tỉnh Đồng Nai · Website: lhu.edu.vn</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Hàm điều phối gửi email thống nhất: Ưu tiên Gmail SMTP (không giới hạn người nhận), sau đó tới Resend
 */
async function dispatchEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  // 1. ƯU TIÊN 1: Gửi qua Gmail SMTP nếu được cấu hình (Gửi được cho mọi sinh viên/giảng viên không cần domain)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const from = getSenderAddress();
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[GMAIL SMTP SUCCESS] Đã gửi email tới ${to} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (smtpErr: unknown) {
      console.error('Lỗi khi gửi email qua Gmail SMTP:', smtpErr);
      // Nếu không cấu hình Resend dự phòng thì trả lỗi về cho client
      if (!resend) {
        return {
          success: false,
          error: smtpErr instanceof Error ? smtpErr.message : 'Lỗi gửi email qua Gmail SMTP.',
        };
      }
    }
  }

  // 2. ƯU TIÊN 2: Gửi qua Resend API nếu có cấu hình
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'LHU E-Learning <onboarding@resend.dev>',
        to,
        subject,
        html,
      });

      if (error) {
        console.error('Lỗi khi gửi email qua Resend:', error);
        // Bắt lỗi Sandbox đặc thù của Resend khi gửi tới email khác chủ tài khoản
        if (error.message.includes('only send testing emails to your own email address')) {
          return {
            success: false,
            error:
              'Resend đang ở chế độ Sandbox (chưa gắn domain riêng) nên chỉ gửi được tới email chủ tài khoản. Hãy cấu hình SMTP_USER và SMTP_PASS (Gmail App Password) trong .env để gửi tự do cho mọi sinh viên và giảng viên.',
          };
        }
        return { success: false, error: error.message };
      }

      console.log(`[RESEND SUCCESS] Đã gửi email tới ${to} (ID: ${data?.id})`);
      return { success: true };
    } catch (resendErr: unknown) {
      console.error('Ngoại lệ khi gọi Resend API:', resendErr);
      return {
        success: false,
        error: resendErr instanceof Error ? resendErr.message : 'Lỗi hệ thống khi gửi email.',
      };
    }
  }

  // 3. Fallback: Mô phỏng trong môi trường Dev (khi chưa cấu hình cả 2)
  console.warn(`[DEV EMAIL SIMULATION] Chưa cấu hình Gmail SMTP hoặc Resend API Key. Giả lập gửi tới: ${to} - Tiêu đề: ${subject}`);
  return { success: true };
}

/**
 * Gửi email chứa mã xác thực OTP 6 số (Quên mật khẩu hoặc Kích hoạt tài khoản)
 */
export async function sendOtpEmail({
  to,
  otp,
  purpose,
  userName,
}: {
  to: string;
  otp: string;
  purpose: 'reset_password' | 'register_verify' | 'login_2fa';
  userName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const isReset = purpose === 'reset_password';
  const isRegister = purpose === 'register_verify';

  const subject = isReset
    ? `[LHU E-Learning] Mã xác thực đặt lại mật khẩu: ${otp}`
    : isRegister
      ? `[LHU E-Learning] Mã kích hoạt tài khoản: ${otp}`
      : `[LHU E-Learning] Mã xác thực đăng nhập 2FA: ${otp}`;

  const purposeText = isReset
    ? 'Bạn nhận được email này vì đã yêu cầu <strong>đặt lại mật khẩu</strong> cho tài khoản trên Hệ thống E-Learning Đại học Lạc Hồng.'
    : isRegister
      ? 'Chào mừng bạn đến với Hệ thống E-Learning Đại học Lạc Hồng! Vui lòng dùng mã bên dưới để <strong>xác thực email và kích hoạt tài khoản</strong> của bạn.'
      : 'Hệ thống phát hiện lượt đăng nhập cần <strong>xác thực 2 bước</strong> để bảo vệ tài khoản LHU của bạn.';

  const contentHtml = `
    <p>Xin chào <strong>${userName || to}</strong>,</p>
    <p>${purposeText}</p>
    
    <div class="otp-box">
      <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
        MÃ XÁC THỰC CỦA BẠN (CÓ HIỆU LỰC 5 PHÚT)
      </div>
      <div class="otp-code">${otp}</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
        Mã này chỉ dùng một lần và sẽ hết hạn sau <strong>5 phút</strong>.
      </div>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
      ⚠️ <strong>Bảo mật tài khoản:</strong> Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai, kể cả cán bộ quản trị viên hay nhân viên kỹ thuật LHU. Nếu bạn không yêu cầu thao tác này, xin vui lòng bỏ qua email.
    </div>
  `;

  const html = createEmailTemplate({
    title: isReset ? 'Đặt lại Mật khẩu' : isRegister ? 'Xác thực Tài khoản' : 'Xác thực 2 Bước',
    preheader: `Mã xác thực của bạn là ${otp} (hết hạn sau 5 phút)`,
    contentHtml,
  });

  return dispatchEmail({ to, subject, html });
}

/**
 * Gửi thư mời tham gia giảng dạy cho giảng viên kèm link kích hoạt 1 chạm
 */
export async function sendTeacherInvitationEmail({
  to,
  invitationUrl,
}: {
  to: string;
  invitationUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const contentHtml = `
    <p>Kính gửi Quý Thầy/Cô,</p>
    <p>Ban Quản trị <strong>Hệ thống E-Learning - Trường Đại học Lạc Hồng</strong> trân trọng kính mời Thầy/Cô tham gia vào hệ thống với vai trò <strong>Giảng viên</strong>.</p>
    
    <p>Với tài khoản Giảng viên LHU, Thầy/Cô có thể:</p>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li>Quản lý lớp học phụ trách, phân quyền sinh viên và chia sẻ học liệu bài giảng.</li>
      <li>Sinh câu hỏi thi tự động bằng Trí tuệ Nhân tạo từ tài liệu Word (.docx) hoặc PDF.</li>
      <li>Tổ chức các kỳ thi trực tuyến và chấm bài tự luận linh hoạt.</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" class="btn" target="_blank">
        👉 Kích hoạt Tài khoản Giảng viên
      </a>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
        (Link này có hiệu lực trong vòng 24 giờ và chỉ sử dụng một lần)
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Nếu nút bấm phía trên không hoạt động, Thầy/Cô vui lòng copy đường liên kết sau và dán vào trình duyệt:<br>
      <a href="${invitationUrl}" style="color: #154C99; word-break: break-all;">${invitationUrl}</a>
    </p>
  `;

  const html = createEmailTemplate({
    title: 'Thư mời Giảng viên',
    preheader: 'Kính mời Thầy/Cô kích hoạt tài khoản giảng viên trên Hệ thống E-Learning Đại học Lạc Hồng',
    contentHtml,
  });

  return dispatchEmail({
    to,
    subject: '[LHU E-Learning] Thư mời kích hoạt tài khoản Giảng viên',
    html,
  });
}

/**
 * Gửi email thông báo kết quả phê duyệt hồ sơ ứng tuyển giảng viên
 */
export async function sendTeacherApplicationReviewEmail({
  to,
  teacherName,
  approved,
  note,
}: {
  to: string;
  teacherName: string;
  approved: boolean;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const siteUrl = getEmailSiteUrl();

  const contentHtml = approved
    ? `
      <p>Kính gửi Quý Thầy/Cô <strong>${teacherName}</strong>,</p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0; color: #166534;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">🎉 Hồ sơ của Thầy/Cô đã được phê duyệt thành công!</h3>
        <p style="margin: 0; font-size: 14px;">Tài khoản của Thầy/Cô đã được nâng cấp chính thức lên vai trò <strong>Giảng viên</strong> trên Hệ thống E-Learning Trường Đại học Lạc Hồng.</p>
      </div>
      ${note ? `<p><strong>Ghi chú từ Ban Quản trị:</strong> <em>${note}</em></p>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${siteUrl}/login" class="btn">
          Đăng nhập vào Bảng điều khiển Giảng viên
        </a>
      </div>
    `
    : `
      <p>Kính gửi Quý Thầy/Cô <strong>${teacherName}</strong>,</p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 20px 0; color: #991b1b;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">Thông báo về hồ sơ đăng ký Giảng viên</h3>
        <p style="margin: 0; font-size: 14px;">Rất tiếc, hồ sơ đăng ký tài khoản giảng viên của Thầy/Cô chưa thể phê duyệt vào thời điểm này.</p>
      </div>
      ${note ? `<p><strong>Lý do từ Ban Quản trị:</strong> <em>${note}</em></p>` : ''}
      <p>Thầy/Cô vui lòng cập nhật lại thông tin hoặc liên hệ trực tiếp với Phòng Đào tạo LHU để được hỗ trợ.</p>
    `;

  const html = createEmailTemplate({
    title: approved ? 'Hồ sơ đã được Phê duyệt' : 'Kết quả Hồ sơ Giảng viên',
    preheader: approved ? 'Hồ sơ giảng viên của bạn đã được duyệt thành công' : 'Thông báo về kết quả hồ sơ giảng viên',
    contentHtml,
  });

  return dispatchEmail({
    to,
    subject: approved
      ? '[LHU E-Learning] Chúc mừng: Hồ sơ Giảng viên đã được phê duyệt!'
      : '[LHU E-Learning] Thông báo về hồ sơ đăng ký Giảng viên',
    html,
  });
}
