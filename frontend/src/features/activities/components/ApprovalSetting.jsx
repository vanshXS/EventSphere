export default function ApprovalSetting({
  checked,
  onChange,
  disabled = false,
  editing = false
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 accent-indigo-600"
        />

        <span>
          <span className="block text-sm font-semibold text-slate-800">
            Require organizer approval
          </span>

          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            {checked
              ? "New requests wait for your review. Pending requests reserve an entry."
              : "Eligible participants are approved as soon as they register."}
          </span>
        </span>
      </label>

      {editing && (
        <p className="mt-3 text-xs text-slate-500">
          Changing this setting affects new registrations only. Existing
          pending requests still need a decision.
        </p>
      )}
    </div>
  );
}