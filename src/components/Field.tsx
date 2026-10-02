import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  max = 1440,
  ...props
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="unit-input">
        <input
          id={id}
          type="number"
          min="0"
          max={max}
          step="1"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? NaN : Number(e.target.value))
          }
          {...props}
        />
        <span aria-hidden="true">min</span>
      </div>
    </label>
  );
}
