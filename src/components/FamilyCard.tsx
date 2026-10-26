import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Wifi, Lock, Unlock, Bell, BellOff, SlidersHorizontal, Check, X, ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { toast } from 'sonner'
import { getUsdc } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { useTransactionHistory, formatTxTime, type TxRecord } from '@/hooks/useTransactionHistory'
import { TxDetailSheet } from './TxDetailSheet'

const TARGET_CHAIN_ID = 5042 // Arc Mainnet

const glass = {
  card: {
    background: 'rgba(255,255,255,0.64)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.68)',
    boxShadow: '0 8px 32px rgba(18,45,69,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255,255,255,0.46)',
    border: '1px solid rgba(255,255,255,0.56)',
  } as React.CSSProperties,
}


const QUICK_LIMITS = [50, 100, 200, 500]

export function FamilyCard() {
  const { address } = useAccount()
  const [showCardNumber, setShowCardNumber] = useState(false)

  // Card management state
  const [cardLocked, setCardLocked] = useState(false)
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [showLimitSheet, setShowLimitSheet] = useState(false)
  const [limitInput, setLimitInput] = useState('100')
  const [selectedTx, setSelectedTx] = useState<TxRecord | null>(null)

  const { txs, loading: txLoading, error: txError } = useTransactionHistory(address)

  const usdcFact = getUsdc(TARGET_CHAIN_ID)
  const USDC_ADDRESS = usdcFact?.address as `0x${string}` | undefined

  const { data: rawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address && !!USDC_ADDRESS },
  })

  const formatted = rawBalance != null
    ? Amount.fromRaw(rawBalance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : null

  const spent = txs.filter((t) => t.direction === 'out').reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)

  return (
    <div className="space-y-4">
      {/* Physical card visual */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative overflow-hidden rounded-3xl p-6 select-none"
        style={{
          background: 'linear-gradient(135deg, #122d45 0%, #1061a6 55%, #1a3a6b 100%)',
          boxShadow: '0 20px 60px rgba(18,45,69,0.30)',
          minHeight: 188,
        }}
      >
        {/* Spectral strip top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)' }}
        />
        {/* Decorative circle */}
        <div className="absolute -right-10 -top-10 size-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)' }} />
        <div className="absolute right-4 top-4">
          <Wifi className="size-5 rotate-90 opacity-50 text-white" />
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <TokenUSDC variant="mono" size={16} />
          </div>
          <span className="font-bold text-white text-sm tracking-widest">FAMILYLINK</span>
        </div>

        {/* Card number */}
        <div className="mb-5">
          <p
            className="mono text-white text-base font-medium tracking-widest cursor-pointer select-none"
            onClick={() => setShowCardNumber((v) => !v)}
          >
            {showCardNumber ? '4716 8821 4490 3312' : '**** **** **** 3312'}
          </p>
          <p className="text-xs mt-0.5 opacity-50 text-white">{showCardNumber ? 'Nhấn để ẩn' : 'Nhấn để hiện'}</p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white opacity-50 mb-0.5 tracking-wide uppercase">Số dư</p>
            <p className="display font-bold text-2xl text-white tabular-nums">
              {formatted != null ? `$${formatted}` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white opacity-50 mb-0.5 tracking-wide uppercase">HSD</p>
            <p className="text-sm font-semibold text-white">12/28</p>
          </div>
        </div>
      </motion.div>

      {/* Spending stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={glass.inner}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Đã chi tháng này</p>
          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--danger)' }}>${spent}</p>
        </div>
        <div className="rounded-2xl p-4" style={glass.inner}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Cashback tích lũy</p>
          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>+$0.89</p>
        </div>
      </div>

      {/* Recent transactions */}
      <section className="rounded-3xl p-5" style={glass.card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Lịch sử chi tiêu</h3>
          <div className="flex items-center gap-2">
            {txLoading && <Loader2 className="size-3.5 animate-spin" style={{ color: 'var(--muted)' }} />}
            {!txLoading && txs.some((t) => t.source === 'onchain') && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(26,128,71,0.10)', color: 'var(--success)' }}>
                Onchain
              </span>
            )}
          </div>
        </div>

        {txError && (
          <div className="flex items-center gap-2 mb-3 text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(186,43,76,0.07)', color: 'var(--danger)' }}>
            <RefreshCw className="size-3.5" /> {txError} — hiển thị dữ liệu mẫu
          </div>
        )}

        <div className="space-y-1">
          {txs.slice(0, 10).map((tx, i) => (
            <motion.button
              key={tx.hash}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedTx(tx)}
              className="w-full flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.03] active:bg-black/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tx.direction === 'out' ? 'rgba(186,43,76,0.10)' : 'rgba(26,128,71,0.10)' }}
                >
                  {tx.direction === 'out'
                    ? <ArrowUpRight className="size-4" style={{ color: 'var(--danger)' }} />
                    : <ArrowDownLeft className="size-4" style={{ color: 'var(--success)' }} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {tx.label ?? (tx.direction === 'out' ? `Gửi đến ${tx.to.slice(0, 6)}...` : `Nhận từ ${tx.from.slice(0, 6)}...`)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    {tx.timestamp ? formatTxTime(tx.timestamp) : `Block #${tx.blockNumber}`}
                    {tx.source === 'onchain' && <span className="ml-1.5 opacity-60">· Arc</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: tx.direction === 'out' ? 'var(--danger)' : 'var(--success)' }}
                >
                  {tx.direction === 'out' ? '-' : '+'}{tx.amount}
                </span>
                <ChevronRight className="size-3.5 opacity-30" style={{ color: 'var(--ink)' }} />
              </div>
            </motion.button>
          ))}

          {txLoading && txs.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: 'var(--muted)' }}>
              <Loader2 className="size-4 animate-spin" /> Đang tải giao dịch...
            </div>
          )}
        </div>
      </section>

      {/* Transaction detail sheet */}
      <TxDetailSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />

      {/* Card management */}
      <div className="rounded-3xl p-5" style={glass.card}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ink)' }}>Quản lý thẻ</h3>

        {/* Spending limit row */}
        <button
          onClick={() => { setLimitInput(String(dailyLimit)); setShowLimitSheet(true) }}
          className="w-full flex items-center justify-between py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,97,166,0.10)' }}>
              <SlidersHorizontal className="size-4" style={{ color: 'var(--accent-hover)' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Hạn mức chi tiêu hàng ngày</p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>Hiện tại: ${dailyLimit} / ngày</p>
            </div>
          </div>
          <ChevronRight className="size-4 opacity-40" style={{ color: 'var(--ink)' }} />
        </button>

        {/* Card lock row */}
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="size-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: cardLocked ? 'rgba(186,43,76,0.10)' : 'rgba(26,128,71,0.10)' }}
            >
              {cardLocked
                ? <Lock className="size-4" style={{ color: 'var(--danger)' }} />
                : <Unlock className="size-4" style={{ color: 'var(--success)' }} />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Khóa / Mở thẻ tạm thời</p>
              <p className="text-xs" style={{ color: cardLocked ? 'var(--danger)' : 'var(--success)' }}>
                {cardLocked ? 'Thẻ đang bị khóa' : 'Thẻ đang hoạt động'}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => {
              const next = !cardLocked
              setCardLocked(next)
              toast(next ? 'Thẻ đã bị khóa' : 'Thẻ đã được mở khóa', {
                icon: next ? '🔒' : '🔓',
              })
            }}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            style={{ background: cardLocked ? 'var(--danger)' : 'var(--success)' }}
            aria-label="toggle card lock"
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="inline-block size-5 rounded-full bg-white shadow"
              style={{ marginLeft: cardLocked ? 22 : 2 }}
            />
          </button>
        </div>

        {/* Notifications row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div
              className="size-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: notificationsOn ? 'rgba(16,97,166,0.10)' : 'rgba(107,101,128,0.10)' }}
            >
              {notificationsOn
                ? <Bell className="size-4" style={{ color: 'var(--accent-hover)' }} />
                : <BellOff className="size-4" style={{ color: 'var(--muted)' }} />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Thông báo mỗi lần quẹt thẻ</p>
              <p className="text-xs" style={{ color: notificationsOn ? 'var(--accent-hover)' : 'var(--muted)' }}>
                {notificationsOn ? 'Đang bật' : 'Đã tắt'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !notificationsOn
              setNotificationsOn(next)
              toast(next ? 'Đã bật thông báo quẹt thẻ' : 'Đã tắt thông báo quẹt thẻ')
            }}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            style={{ background: notificationsOn ? 'var(--accent-hover)' : 'var(--border-strong)' }}
            aria-label="toggle notifications"
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="inline-block size-5 rounded-full bg-white shadow"
              style={{ marginLeft: notificationsOn ? 22 : 2 }}
            />
          </button>
        </div>
      </div>

      {/* Spending limit bottom sheet */}
      <AnimatePresence>
        {showLimitSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLimitSheet(false)}
          >
            <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
            <motion.section
              className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Spectral strip */}
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)' }} />
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-black/10" />
              </div>
              <div className="px-5 pb-8 pt-3">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Hạn mức hàng ngày</h3>
                  <button onClick={() => setShowLimitSheet(false)} className="size-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-muted)' }}>
                    <X className="size-4" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>

                {/* Amount input */}
                <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid rgba(255,255,255,0.56)' }}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="display text-3xl font-bold" style={{ color: 'var(--subtle)' }}>$</span>
                    <input
                      inputMode="numeric"
                      value={limitInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        setLimitInput(v)
                      }}
                      className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none"
                      style={{ color: 'var(--ink)' }}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>USDC / ngày</p>
                </div>

                {/* Quick pick */}
                <div className="flex gap-2 mb-5">
                  {QUICK_LIMITS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setLimitInput(String(q))}
                      className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
                      style={{
                        background: limitInput === String(q) ? 'var(--accent)' : 'var(--surface-muted)',
                        color: limitInput === String(q) ? 'white' : 'var(--ink-2)',
                      }}
                    >
                      ${q}
                    </button>
                  ))}
                </div>

                <button
                  disabled={!limitInput || parseInt(limitInput) <= 0}
                  onClick={() => {
                    const val = parseInt(limitInput)
                    if (val > 0) {
                      setDailyLimit(val)
                      setShowLimitSheet(false)
                      toast.success(`Hạn mức đã cập nhật: $${val} / ngày`)
                    }
                  }}
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  <Check className="size-4" /> Lưu hạn mức
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
