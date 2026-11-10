/* Ornamen keychain yang bisa dipilih di konfigurator 3D. */
export const CHARMS = [
  { key: 'pen', label: 'Mini pulpen' },
  { key: 'bookmark', label: 'Pembatas buku' },
  { key: 'highlighter', label: 'Stabilo' },
]

export const DEFAULT_CHARMS = { pen: true, bookmark: true, highlighter: true }

export function charmLabels(active = DEFAULT_CHARMS) {
  return CHARMS.filter((c) => active[c.key])
    .map((c) => c.label)
    .join(', ')
}

export function hasCharm(active = DEFAULT_CHARMS) {
  return CHARMS.some((c) => active[c.key])
}
