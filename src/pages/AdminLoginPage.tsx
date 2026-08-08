import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useLoginMutation } from '@/features/auth/queries';
import { loginFormSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/store';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { consumeSessionExpiredFlag, SESSION_EXPIRED_MESSAGE } from '@/shared/api/refreshQueue';
import { tokenManager } from '@/shared/api/tokenManager';
import { FormField } from '@/shared/components/form/FormField';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { fieldLimits } from '@/shared/constants/fieldLimits';
import { ROUTES } from '@/shared/constants/routes';

/** ADMIN_LOGIN — 01 §5. 카드는 보더 없이 shadow-card + radius 14. 레이아웃은 LoginLayout 이 감싼다. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const loginMutation = useLoginMutation();

  // 세션이 만료돼 튕겨 온 경우 "다시 로그인해주세요." 를 여기서 띄운다 (01 §9-1).
  // 하드 리로드를 거치면서 토스트가 날아가므로 표식을 넘겨받는 구조다.
  useEffect(() => {
    if (consumeSessionExpiredFlag()) toast.error(SESSION_EXPIRED_MESSAGE);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    // onChange 로는 검증하지 않는다. onBlur 에서 그 필드만, 제출할 때 전체 (04 §9 · good-patterns).
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { loginId: '', password: '' },
  });

  const isPending = loginMutation.isPending;

  /**
   * 401 은 인터셉터가 그대로 통과시키고 토스트도 뜨지 않는다. 여기서 카드 하단에 직접 그린다 (01 §5-2).
   * 문구는 서버가 준 message 를 그대로 쓴다 — 5000번대는 이미 구어체다 (04 §9-2).
   */
  const error = loginMutation.error;
  const loginFailedMessage =
    isAxiosError(error) && error.response?.status === 401 ? getErrorMessage(error) : null;

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: ({ accessToken, name }) => {
        tokenManager.set(accessToken, name);
        setAdmin(name);
        navigate(ROUTES.HOME, { replace: true });
      },
    });
  });

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-h1 text-foreground">USS 관리자</h1>
        <p className="mt-1 text-body text-fg-secondary">강의 데이터 관리 시스템</p>
      </div>

      <div className="rounded-card bg-surface p-6 shadow-card">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="loginId" label="아이디" error={errors.loginId?.message}>
            <Input
              id="loginId"
              autoComplete="username"
              autoFocus
              maxLength={fieldLimits.loginId}
              disabled={isPending}
              aria-invalid={errors.loginId !== undefined}
              {...register('loginId')}
            />
          </FormField>

          <FormField id="password" label="비밀번호" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              maxLength={fieldLimits.password}
              disabled={isPending}
              aria-invalid={errors.password !== undefined}
              {...register('password')}
            />
          </FormField>

          {loginFailedMessage !== null && (
            <p role="alert" className="flex items-center gap-2 text-caption text-danger-text">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {loginFailedMessage}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
            로그인
          </Button>
        </form>
      </div>
    </>
  );
}
