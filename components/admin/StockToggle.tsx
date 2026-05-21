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
        text-xs font-semibold px-3 py-1.5 rounded-full transition-all
        flex-shrink-0 min-w-[84px] text-center
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
        ${enStock
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-red-100 text-red-600 hover:bg-red-200"
        }
      `}
    >
      {enStock ? "En stock" : "Sin stock"}
    </button>
  );
}
