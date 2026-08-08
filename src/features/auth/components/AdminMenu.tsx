import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth/store';
import { queryClient } from '@/shared/api/queryClient';
import { tokenManager } from '@/shared/api/tokenManager';
import { ConfirmModal } from '@/shared/components/modals/ConfirmModal';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

export function AdminMenu() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = useAuthStore((state) => state.name);
  const reset = useAuthStore((state) => state.reset);
  const navigate = useNavigate();

  const handleLogout = () => {
    tokenManager.clear();
    reset();
    queryClient.clear();
    setConfirmOpen(false);
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex items-center gap-3">
      {name !== null && <span className="text-body text-fg-secondary">{name}</span>}
      <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
        <LogOut className="h-5 w-5" />
        로그아웃
      </Button>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="로그아웃할까요?"
        confirmLabel="확인"
        onConfirm={handleLogout}
      />
    </div>
  );
}
