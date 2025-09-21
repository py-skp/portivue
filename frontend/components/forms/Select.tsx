"use client";
type Option = { value: string | number; label: string };
export function Select({
  label, options, register, name, required, disabled
}: {
  label: string; options: Option[];
  register: any; name: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-sm">{label}{required ? "*" : ""}</div>
      <select {...register(name, { required })} disabled={disabled} className="w-full rounded border p-2">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}