"use client";

interface Props {
  ready: number;
  total: number;
}

export default function LibraryProgress({ ready, total }: Props) {
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

  return (
    <div className="mb-6">
      <p className="text-text-secondary font-ui text-sm mb-2">
        Your collection: {ready} of {total} books ready
      </p>
      <div className="w-full h-3 bg-background rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-text-secondary font-ui text-xs mt-1">{pct}%</p>
    </div>
  );
}
