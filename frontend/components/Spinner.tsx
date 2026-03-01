interface Props {
  label?: string;
  size?: "sm" | "md";
}

export default function Spinner({ label, size = "md" }: Props) {
  const ringSize = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  const borderWidth = size === "sm" ? "border-2" : "border-[3px]";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${ringSize} ${borderWidth} border-border border-t-accent rounded-full animate-spin`}
      />
      {label && (
        <span className="text-text-secondary font-ui text-sm">{label}</span>
      )}
    </div>
  );
}
