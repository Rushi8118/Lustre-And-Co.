/** Escapes user input so it can be embedded safely in a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactMatch(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
}

export function containsMatch(value: string): RegExp {
  return new RegExp(escapeRegex(value.trim()), 'i');
}
