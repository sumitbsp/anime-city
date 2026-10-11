export default function Picker({ label, options, value, onChange }) {
  return (
    <label className="picker">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          // Hand focus back so WASD moves the character instead of changing the selection.
          e.target.blur()
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}
