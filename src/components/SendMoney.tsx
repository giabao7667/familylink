import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ExternalLink, Loader2, ChevronRight } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl, requireChain } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

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

const QUICK_AMOUNTS = ['10', '50', '100', '200']

const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

export function SendMoney() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

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

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID
  const validRecipient = recipient.trim() !== '' && isAddress(recipient.trim())
  const validAmount = parseFloat(amount) > 0
  const ready = isConnected && !isWrongChain && validRecipient && validAmount && !!USDC_ADDRESS

  const handleSend = () => {
    if (isWrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!ready || !USDC_ADDRESS) return
    const parsed = parseAmount(TARGET_CHAIN_ID, amount)
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient.trim() as `0x${string}`, parsed.raw],
      chainId: TARGET_CHAIN_ID,
    })
  }

  const txUrl = hash ? buildTxExplorerUrl(TARGET_CHAIN_ID, hash) : undefined
  const chainName = requireChain(TARGET_CHAIN_ID).name

  const errorMsg = writeError
    ? writeError.message.includes('rejected') || writeError.message.includes('denied')
      ? null
      : writeError.message.includes('insufficient')
        ? 'Số dư không đủ để gửi.'
        : 'Giao dịch thất bại. Vui lòng thử lại.'
    : null

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <section className="rounded-3xl p-5" style={glass.card}>
        <div className="mb-2 flex items-center gap-2">
          <TokenUSDC variant="branded" size={18} />
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.07em' }}>Số dư của bạn</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatted ?? '—'}
          </span>
          <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{chainName}</p>
      </section>

      {/* Amount input */}
      <div className="rounded-2xl p-4" style={glass.inner}>
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>Số tiền gửi</label>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, '')
            if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
          }}
          placeholder="0.00"
          className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
          style={{ color: 'var(--ink)' }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</span>
          {formatted && (
            <button
              onClick={() => setAmount(formatted)}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent-hover)' }}
            >
              Tối đa: {formatted}
            </button>
          )}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(q)}
            className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
            style={{
              background: amount === q ? 'var(--accent)' : 'rgba(255,255,255,0.64)',
              color: amount === q ? 'white' : 'var(--ink-2)',
              border: '1px solid rgba(255,255,255,0.68)',
            }}
          >
            ${q}
          </button>
        ))}
      </div>

      {/* Recipient */}
      <div className="rounded-2xl p-4" style={glass.inner}>
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>Địa chỉ ví người nhận</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          spellCheck={false}
          className="mono w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--ink)', wordBreak: 'break-all' }}
        />
        {recipient && !validRecipient && (
          <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>Địa chỉ ví không hợp lệ</p>
        )}
      </div>

      {/* Fee preview */}
      {validAmount && validRecipient && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-2"
          style={glass.inner}
        >
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>Phí giao dịch</span>
            <span className="font-semibold" style={{ color: 'var(--success)' }}>~$0.001 USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>Thời gian</span>
            <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>Tức thì (&lt;1 giây)</span>
          </div>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <div className="flex justify-between text-sm font-semibold">
            <span style={{ color: 'var(--ink)' }}>Người nhận nhận được</span>
            <span style={{ color: 'var(--ink)' }}>${amount} USDC</span>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <button
        disabled={!ready || isPending || isConfirming || isSwitching}
        onClick={handleSend}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: 'var(--accent)' }}
      >
        {!isConnected ? 'Kết nối ví để gửi tiền'
          : isWrongChain || isSwitching ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Chuyển sang Arc Mainnet...</span>
          : isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Xác nhận trong ví...</span>
          : isConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Đang xác nhận...</span>
          : <span className="flex items-center justify-center gap-2"><Send className="size-4" />Gửi tiền ngay</span>}
      </button>

      {/* Error */}
      {errorMsg && (
        <p className="text-center text-sm" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
      )}

      {/* Success receipt */}
      <AnimatePresence>
        {isSuccess && txUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-4"
            style={{ ...glass.inner, borderTop: `2px solid var(--success)` }}
          >
            <div style={{ height: 3, background: spectral, borderRadius: 2, marginBottom: 12 }} />
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--success)' }}>Gửi tiền thành công!</div>
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Tiền đã được chuyển tức thì tới gia đình bạn.</p>
            <a
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--accent-hover)' }}
            >
              Xem giao dịch <ExternalLink className="size-3" /> <ChevronRight className="size-3" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
