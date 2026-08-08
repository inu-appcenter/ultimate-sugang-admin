/** DS-01 §6-1 — 에러는 입력창 아래 caption 으로 붙는다. */
export function FieldError({ message }: { message?: string }) {
  if (message === undefined) return null;
  return (
    <p role="alert" className="text-caption text-danger-text">
      {message}
    </p>
  );
}
