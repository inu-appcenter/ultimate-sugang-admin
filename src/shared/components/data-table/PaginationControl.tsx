import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';

interface PaginationControlProps {
  /** 1부터 센다 (03 §2-4). */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** 한 번에 보여줄 페이지 번호 개수. 명세에 없어 스스로 정한 값이다. */
const WINDOW = 5;

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), totalPages - WINDOW + 1));
  const count = Math.min(WINDOW, totalPages);
  return Array.from({ length: count }, (_, index) => start + index);
}

/** 01 §6-1 — [‹ 이전] 1 2 3 [다음 ›]. 페이지 크기는 서버가 10 으로 고정한다. */
export function PaginationControl({ page, totalPages, onChange }: PaginationControlProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-1 pt-4" aria-label="페이지">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-5 w-5" />
        이전
      </Button>

      {pageWindow(page, totalPages).map((number) => (
        <Button
          key={number}
          variant="ghost"
          size="sm"
          onClick={() => onChange(number)}
          aria-current={number === page ? 'page' : undefined}
          className={cn(number === page && 'bg-primary-subtle text-primary hover:bg-primary-subtle')}
        >
          {number}
        </Button>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        다음
        <ChevronRight className="h-5 w-5" />
      </Button>
    </nav>
  );
}
