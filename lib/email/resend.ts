import 'server-only';

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const defaultFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'Mầm Học <onboarding@resend.dev>';

// Khởi tạo client Resend nếu có API Key
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Kiểm tra Resend đã được cấu hình sẵn sàng hay chưa
 */
export function isResendConfigured(): boolean {
  return Boolean(resendApiKey);
}

/**
 * Tạo khung HTML Email responsive chuẩn EdTech với phong cách thương hiệu Mầm Học
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
      background: linear-gradient(135deg, #154C99 0%, #1e3a8a 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #ffffff;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
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
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">MẦM HỌC · ĐẠI HỌC LẠC HỒNG</div>
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px;">Đây là email tự động từ Hệ thống Khảo thí & Học tập Trực tuyến Mầm Học.</p>
        <p style="margin: 0;">Vui lòng không trả lời trực tiếp email này. Nếu cần hỗ trợ, hãy liên hệ phòng Đào tạo.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
    ? `[Mầm Học] Mã xác thực đặt lại mật khẩu: ${otp}`
    : isRegister
      ? `[Mầm Học] Mã kích hoạt tài khoản: ${otp}`
      : `[Mầm Học] Mã xác thực đăng nhập 2FA: ${otp}`;

  const purposeText = isReset
    ? 'Bạn nhận được email này vì đã yêu cầu <strong>đặt lại mật khẩu</strong> cho tài khoản trên hệ thống Mầm Học.'
    : isRegister
      ? 'Chào mừng bạn đến với Mầm Học! Vui lòng dùng mã bên dưới để <strong>xác thực email và kích hoạt tài khoản</strong> của bạn.'
      : 'Hệ thống phát hiện lượt đăng nhập cần <strong>xác thực 2 bước</strong> để bảo vệ tài khoản của bạn.';

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
      ⚠️ <strong>Bảo mật tài khoản:</strong> Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai, kể cả quản trị viên hay nhân viên kỹ thuật. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
    </div>
  `;

  const html = createEmailTemplate({
    title: isReset ? 'Đặt lại Mật khẩu' : isRegister ? 'Xác thực Tài khoản' : 'Xác thực 2 Bước',
    preheader: `Mã xác thực của bạn là ${otp} (hết hạn sau 5 phút)`,
    contentHtml,
  });

  if (!resend) {
    console.warn(`[DEV EMAIL SIMULATION] RESEND_API_KEY chưa cấu hình. Email gửi tới ${to} với OTP: ${otp}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: defaultFromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Lỗi khi gửi email qua Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Ngoại lệ khi gọi Resend API:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi hệ thống khi gửi email.',
    };
  }
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
    <p>Kính gửi Thầy/Cô,</p>
    <p>Ban Quản trị Hệ thống Khảo thí <strong>Mầm Học - Đại học Lạc Hồng</strong> trân trọng kính mời Thầy/Cô tham gia vào hệ thống với vai trò <strong>Giảng viên</strong>.</p>
    
    <p>Với tài khoản Giảng viên, Thầy/Cô có thể:</p>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li>Quản lý lớp học, phân quyền sinh viên và chia sẻ học liệu bài giảng.</li>
      <li>Sinh câu hỏi thi tự động bằng Trí tuệ Nhân tạo từ file Word (.docx) hoặc PDF.</li>
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
    preheader: 'Kính mời Thầy/Cô kích hoạt tài khoản giảng viên trên hệ thống Mầm Học',
    contentHtml,
  });

  if (!resend) {
    console.warn(`[DEV EMAIL SIMULATION] Thư mời gửi tới ${to}: ${invitationUrl}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: defaultFromEmail,
      to,
      subject: '[Mầm Học] Thư mời kích hoạt tài khoản Giảng viên',
      html,
    });

    if (error) {
      console.error('Lỗi gửi thư mời giáo viên qua Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Ngoại lệ khi gửi thư mời giáo viên:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi gửi thư mời.',
    };
  }
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
  const contentHtml = approved
    ? `
      <p>Kính gửi Thầy/Cô <strong>${teacherName}</strong>,</p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0; color: #166534;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">🎉 Hồ sơ của Thầy/Cô đã được phê duyệt thành công!</h3>
        <p style="margin: 0; font-size: 14px;">Tài khoản của Thầy/Cô đã được nâng cấp chính thức lên vai trò <strong>Giảng viên</strong> trên hệ thống Mầm Học.</p>
      </div>
      ${note ? `<p><strong>Ghi chú từ Ban Quản trị:</strong> <em>${note}</em></p>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/login" class="btn">
          Đăng nhập vào Bảng điều khiển Giảng viên
        </a>
      </div>
    `
    : `
      <p>Kính gửi Thầy/Cô <strong>${teacherName}</strong>,</p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 20px 0; color: #991b1b;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">Thông báo về hồ sơ đăng ký giảng viên</h3>
        <p style="margin: 0; font-size: 14px;">Rất tiếc, hồ sơ đăng ký tài khoản giảng viên của Thầy/Cô chưa thể phê duyệt vào thời điểm này.</p>
      </div>
      ${note ? `<p><strong>Lý do từ Ban Quản trị:</strong> <em>${note}</em></p>` : ''}
      <p>Thầy/Cô vui lòng cập nhật lại thông tin hoặc liên hệ trực tiếp với Phòng Đào tạo để được hỗ trợ thêm.</p>
    `;

  const html = createEmailTemplate({
    title: approved ? 'Hồ sơ đã được Phê duyệt' : 'Kết quả Hồ sơ Giảng viên',
    preheader: approved ? 'Hồ sơ giảng viên của bạn đã được duyệt thành công' : 'Thông báo về kết quả hồ sơ giảng viên',
    contentHtml,
  });

  if (!resend) {
    console.warn(`[DEV EMAIL SIMULATION] Review email gửi tới ${to}: approved=${approved}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: defaultFromEmail,
      to,
      subject: approved
        ? '[Mầm Học] Chúc mừng: Hồ sơ Giảng viên đã được phê duyệt!'
        : '[Mầm Học] Thông báo về hồ sơ đăng ký Giảng viên',
      html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi gửi email review.' };
  }
}
