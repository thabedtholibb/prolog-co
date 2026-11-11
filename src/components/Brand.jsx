/*
 * Wordmark resmi (dipotong dari logo-full, latar transparan). Dipakai ulang
 * di header, footer, checkout, dan admin supaya brand konsisten.
 */
export default function Brand({ dark = false, mark = false, className = '', logoClass = 'h-9' }) {
  return (
    <span className={`flex items-center ${className}`}>
      <img
        src={mark ? '/logo-mark-white.png' : '/logo-wordmark.png'}
        alt="Prolog.co"
        width={mark ? 2000 : 1292}
        height={mark ? 2000 : 272}
        className={`${logoClass} w-auto ${dark && !mark ? 'brightness-0 invert' : ''}`}
      />
    </span>
  )
}
