import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, BookOpen, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/subjects/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Bảo mật nghiêm ngặt: Kiểm tra user.app_metadata.role === 'admin'
  // Kết hợp kiểm tra dự phòng bảng user_roles để đồng bộ cơ sở dữ liệu
  const isMetadataAdmin = user.app_metadata?.role === 'admin';

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isDbAdmin = roleRecord?.role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    redirect('/subjects');
  }

  return (
    <div className="min-h-screen bg-[#f3f6f3] text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#dfe7e0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#17372e] text-[#c9ed99] shadow-xs">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#648174]">
                  Quản trị Hệ thống
                </span>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0 font-semibold">
                  Admin
                </Badge>
              </div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Mầm Học Khảo Thí
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/subjects"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <BookOpen className="size-4" />
              <span className="hidden sm:inline">Xem Môn học</span>
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600 hover:text-red-700 hover:border-red-200"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
