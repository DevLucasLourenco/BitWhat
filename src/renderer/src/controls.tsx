// Controles das configurações (aba Aparência, Comportamento, Segurança...).

interface SegmentedControlProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string; icon?: JSX.Element }>
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>): JSX.Element {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? 'selected' : undefined}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SwitchRowProps {
  checked: boolean
  label: string
  title?: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function SwitchRow({ checked, label, title, disabled = false, onChange }: SwitchRowProps): JSX.Element {
  return (
    <label className={disabled ? 'switch-row disabled' : 'switch-row'} title={title}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  )
}
