type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-indigo-500/90 hover:bg-indigo-500 text-white shadow-glow",
        variant === "ghost" &&
          "bg-white/5 hover:bg-white/10 text-zinc-100 border border-white/10",
        className
      )}
      {...props}
    />
  );
}
