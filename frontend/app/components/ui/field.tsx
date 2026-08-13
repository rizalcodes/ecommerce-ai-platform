import type { ComponentProps, ReactNode } from "react";

/* Form controls. Focus ring comes from the global focus-visible rule, so the
   accent stays consistent with links and never doubles up. */

const control =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink " +
  "placeholder:text-ink-faint hover:border-ink-faint disabled:opacity-50";

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={[control, "h-10", className].filter(Boolean).join(" ")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={[control, "py-2.5", className].filter(Boolean).join(" ")} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={[control, "h-10 pr-8", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-ink">{children}</p>;
}
