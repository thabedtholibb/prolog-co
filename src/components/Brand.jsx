/*
 * Wordmark resmi (dipotong dari logo-full, latar transparan). Dipakai ulang
 * di header, footer, checkout, dan admin supaya brand konsisten.
 */
export default function Brand({ dark = false, className = '', logoClass = 'h-9' }) {
  return (
    <span className={`flex items-center ${className}`}>
      <img
        src="/logo-wordmark.png"
        alt="Prolog.co"
        width={1292}
        height={272}
        className={`${logoClass} w-auto ${dark ? 'brightness-0 invert' : ''}`}
      />
    </span>
  )
}
