import { Children, cloneElement, isValidElement, useId } from "react";
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
  const generatedId = useId();
  type ControlProps = { id?: string; "aria-describedby"?: string };
  const isControl = (child: ReactNode) =>
    isValidElement<ControlProps>(child) &&
    ["input", "textarea", "select"].includes(String(child.type));
  const control = Children.toArray(children).find(isControl);
  const controlId =
    (isValidElement<ControlProps>(control) ? control.props.id : undefined) ??
    generatedId;
  const hintId = `${generatedId}-hint`;
  const description =
    [
      isValidElement<ControlProps>(control)
        ? control.props["aria-describedby"]
        : undefined,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={controlId}>{label}</label>
      {Children.map(children, (child) =>
        isControl(child) && isValidElement<ControlProps>(child)
          ? cloneElement(child, {
              id: controlId,
              "aria-describedby": description,
            })
          : child,
      )}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
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
