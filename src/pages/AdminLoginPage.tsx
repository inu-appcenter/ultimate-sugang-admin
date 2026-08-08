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

export function AdminLoginPage() {
  const navigate = useNavigate();
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const loginMutation = useLoginMutation();

  useEffect(() => {
    if (consumeSessionExpiredFlag()) toast.error(SESSION_EXPIRED_MESSAGE);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { loginId: '', password: '' },
  });

  const isPending = loginMutation.isPending;

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
