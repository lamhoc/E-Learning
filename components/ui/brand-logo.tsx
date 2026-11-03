import Image from 'next/image';
import Link from 'next/link';

export const LHU_LOGO_PATH = '/logo-lhu.png';

export interface BrandLogoProps {
  /**
   * Đường dẫn khi click vào Logo. Bỏ qua nếu không muốn bọc thẻ Link.
   * Mặc định là '/'
   */
  href?: string | null;
  /**
   * Kích thước chiều cao của ảnh Logo
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Biến thể hiển thị:
   * - 'framed': Khung nền sáng bo góc tinh tế (chuẩn cho Sidebar/nền tối/Dark Mode)
   * - 'plain': Không có khung nền
   */
  variant?: 'framed' | 'plain';
  /**
   * Nhãn phân hệ phụ hiển thị bên cạnh hoặc bên dưới (ví dụ: "Giảng viên", "Sinh viên", "Quản trị")
   */
  badgeText?: string;
  /**
   * Tiêu đề nhỏ bên dưới logo (ví dụ: "Không gian học tập")
   */
  subtitle?: string;
  /**
   * Class tùy biến cho container bên ngoài
   */
  className?: string;
  /**
   * Class tùy biến cho ảnh Image
   */
  imageClassName?: string;
  /**
   * Tải ưu tiên ảnh
   */
  priority?: boolean;
}

export function BrandLogo({
  href = '/',
  size = 'md',
  variant = 'framed',
  badgeText,
  subtitle,
  className = '',
  imageClassName = '',
  priority = true,
}: BrandLogoProps) {
  // Tỉ lệ logo LHU: 2048 x 920 (~2.22:1)
  const sizeStyles = {
    sm: { height: 28, width: 62, imgClass: 'h-7 w-auto' },
    md: { height: 34, width: 76, imgClass: 'h-8.5 w-auto' },
    lg: { height: 42, width: 93, imgClass: 'h-10.5 w-auto' },
    xl: { height: 50, width: 111, imgClass: 'h-12.5 w-auto' },
  }[size];

  const logoImage = (
    <Image
      src={LHU_LOGO_PATH}
      alt="Đại học Lạc Hồng - Powered by Arizona State University"
      width={sizeStyles.width}
      height={sizeStyles.height}
      priority={priority}
      className={`object-contain select-none transition-transform duration-200 ${sizeStyles.imgClass} ${imageClassName}`}
    />
  );

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {variant === 'framed' ? (
        <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5 shadow-xs border border-white/30 backdrop-blur-sm transition-all duration-200 hover:shadow-sm dark:bg-white/95 dark:border-white/20">
          {logoImage}
        </div>
      ) : (
        logoImage
      )}

      {(badgeText || subtitle) && (
        <div className="flex flex-col justify-center min-w-0">
          {badgeText && (
            <span className="inline-flex items-center rounded-md bg-[#EAB308]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FACC15] w-fit">
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-300 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#154C99] rounded-xl"
        title="Đại học Lạc Hồng (LHU)"
      >
        {content}
      </Link>
    );
  }

  return content;
}

