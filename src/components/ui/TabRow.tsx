"use client";

type TabRowProps<T extends string> = {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
};

export function TabRow<T extends string>({ tabs, active, onChange }: TabRowProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`min-h-12 min-w-[4.5rem] flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.id ? "bg-[#4f90c6] text-white shadow-sm" : "text-[#2f4a60] hover:text-[#1b3348]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
