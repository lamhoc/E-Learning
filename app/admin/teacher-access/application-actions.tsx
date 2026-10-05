import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reviewTeacherApplication } from './actions';

export function ApplicationActions({ userId }: { userId: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <form action={reviewTeacherApplication}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="decision" value="approve" />
        <Button type="submit" size="sm" className="gap-1.5">
          <Check aria-hidden="true" className="size-3.5" /> Duyệt
        </Button>
      </form>
      <form action={reviewTeacherApplication}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="decision" value="reject" />
        <Button type="submit" size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <X aria-hidden="true" className="size-3.5" /> Từ chối
        </Button>
      </form>
    </div>
  );
}
