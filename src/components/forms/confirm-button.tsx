"use client";

/** Göndermeden önce onay isteyen düğme (silme gibi geri alınamaz işlemler için). */
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
