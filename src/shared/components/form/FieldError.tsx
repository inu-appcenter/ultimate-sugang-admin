export function FieldError({ message }: { message?: string }) {
  if (message === undefined) return null;
  return (
    <p role="alert" className="text-caption text-danger-text">
      {message}
    </p>
  );
}
