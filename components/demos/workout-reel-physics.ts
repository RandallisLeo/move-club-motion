// Fast throws settle on five-minute landmarks; deliberate drags stay minute-precise.
export function getWorkoutRelease(
  position: number,
  velocity: number,
  travel: number,
) {
  const clamp = (value: number) => Math.max(1, Math.min(60, value));
  const speed = Math.max(-65, Math.min(65, velocity));
  const throwing = Math.abs(speed) >= 8 && Math.abs(travel) >= 1.5;
  if (!throwing)
    return { target: Math.round(clamp(position)), throwing: false };

  const projected = clamp(position + speed * 0.26);
  // Include the one-minute endpoint as a landmark alongside 5, 10, ... 60.
  let target = projected < 3 ? 1 : Math.round(projected / 5) * 5;
  // A magnet must never pull a throw back against the user's direction.
  if (speed > 0 && target < position) target = Math.ceil(position / 5) * 5;
  if (speed < 0 && target > position) target = Math.floor(position / 5) * 5;
  return { target: clamp(target), throwing: true };
}
