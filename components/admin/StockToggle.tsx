"use client";

interface Props {
  enStock: boolean;
  onChange: (enStock: boolean) => void;
  disabled?: boolean;
}

export default function StockToggle({ enStock, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enStock)}
      disabled={disabled}
      className={`
        flex-shrink-0 min-w-[104px] sm:min-w-[90px] text-center select-none
        text-sm sm:text-xs font-semibold px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-full ring-1 transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
        ${enStock
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
          : "bg-muted/60 text-muted-foreground ring-border hover:bg-muted"
        }
      `}
    >
      {enStock ? "En stock" : "Sin stock"}
    </button>
  );
}
