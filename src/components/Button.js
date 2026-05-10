import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ variant = "secondary", size = "md", className, ...props }) {
    const baseClasses = "font-medium rounded transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap";
    const variantClasses = {
        primary: "bg-[var(--accent)] text-white border border-transparent hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed",
        secondary: "bg-none border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--bg)] hover:border-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed",
        danger: "bg-[oklch(98%_0.015_22)] text-[oklch(42%_0.18_22)] border border-[oklch(88%_0.06_22)] hover:bg-[oklch(95%_0.025_22)] disabled:opacity-50 disabled:cursor-not-allowed",
    };
    const sizeClasses = {
        sm: "h-7 px-2 text-xs",
        md: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-base",
    };
    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ""}`;
    return _jsx("button", { className: combinedClasses, ...props });
}
export function IconButton({ icon, label, className, ...props }) {
    const baseClasses = "w-8 h-8 rounded flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] transition-all";
    return (_jsx("button", { className: `${baseClasses} ${className || ""}`, "aria-label": label, title: label, ...props, children: icon }));
}
