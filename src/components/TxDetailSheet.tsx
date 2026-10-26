import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, ArrowDownLeft, ArrowUpRight, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { TxRecord } from '@/hooks/useTransactionHistory'
import { formatTxTime } from '@/hooks/useTransactionHistory'

interface Props {
  tx: TxRecord | null
  onClose: () => void
}

const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

function shortAddr(addr: string) {
  if (!addr || addr.startsWith('mock')) return '—'
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function copyToClipboard(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}`))
}

export function TxDetailSheet({ tx, onClose }: Props) {
  return (
    <AnimatePresence>
      {tx && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: spectral }} />
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-black/10" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Chi tiết giao dịch</h3>
                <button
                  onClick={onClose}
                  className="size-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-muted)' }}
                >
                  <X className="size-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>

              {/* Amount hero */}
              <div className="rounded-2xl p-5 mb-5 flex flex-col items-center" style={{ background: tx.direction === 'out' ? 'rgba(186,43,76,0.06)' : 'rgba(26,128,71,0.06)' }}>
                <div
                  className="size-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: tx.direction === 'out' ? 'rgba(186,43,76,0.12)' : 'rgba(26,128,71,0.12)' }}
                >
                  {tx.direction === 'out'
                    ? <ArrowUpRight className="size-6" style={{ color: 'var(--danger)' }} />
                    : <ArrowDownLeft className="size-6" style={{ color: 'var(--success)' }} />}
                </div>
                <p className="display text-3xl font-bold tabular-nums" style={{ color: tx.direction === 'out' ? 'var(--danger)' : 'var(--success)' }}>
                  {tx.direction === 'out' ? '-' : '+'}{tx.amount} USDC
                </p>
                {tx.label && (
                  <p className="mt-1 text-sm font-medium" style={{ color: 'var(--muted)' }}>{tx.label}</p>
                )}
                <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>
                  {tx.timestamp ? formatTxTime(tx.timestamp) : '—'}
                </p>
              </div>

              {/* Details rows */}
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Từ', value: shortAddr(tx.from), copy: tx.source === 'onchain' ? tx.from : null },
                  { label: 'Đến', value: shortAddr(tx.to), copy: tx.source === 'onchain' ? tx.to : null },
                  { label: 'Block', value: tx.blockNumber > 0n ? `#${tx.blockNumber.toString()}` : '—', copy: null },
                  { label: 'Nguồn', value: tx.source === 'onchain' ? 'Blockchain (Arc Mainnet)' : 'Dữ liệu mẫu', copy: null },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{row.value}</span>
                      {row.copy && (
                        <button
                          onClick={() => copyToClipboard(row.copy!, row.label)}
                          className="size-5 rounded flex items-center justify-center"
                          style={{ background: 'var(--surface-muted)' }}
                        >
                          <Copy className="size-3" style={{ color: 'var(--subtle)' }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* TX hash row */}
                {tx.source === 'onchain' && tx.hash && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>TX Hash</span>
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-xs" style={{ color: 'var(--ink-2)' }}>{shortAddr(tx.hash)}</span>
                      <button
                        onClick={() => copyToClipboard(tx.hash, 'TX hash')}
                        className="size-5 rounded flex items-center justify-center"
                        style={{ background: 'var(--surface-muted)' }}
                      >
                        <Copy className="size-3" style={{ color: 'var(--subtle)' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Explorer link */}
              {tx.explorerUrl && (
                <a
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  Xem trên ArcScan <ExternalLink className="size-4" />
                </a>
              )}
              {!tx.explorerUrl && (
                <div
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 opacity-40"
                  style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
                >
                  Dữ liệu mẫu — không có link explorer
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
