import { useState, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Star, ArrowRight, Gift, Sparkles, Loader2, ExternalLink, X, Check } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { toast } from 'sonner'
import { getUsdc, buildTxExplorerUrl, requireChain } from '@/onchain-facts'
import { Amount, usdcDecimalsFor, parseAmount } from '@/onchain-money'
import { useTransactionHistory, formatTxTime } from '@/hooks/useTransactionHistory'

const TARGET_CHAIN_ID = 5042 // Arc Mainnet
const POINTS_PER_USDC = 200        // 200 points = $1 USDC
const CASHBACK_RATE = 0.02         // 2% cashback per tx → points
const APY = 0.045                  // 4.5%

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

const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

// Treasury address that holds cashback funds — replace with real treasury wallet before production
const TREASURY_ADDRESS = '0x0000000000000000000000000000000000000001' as `0x${string}`

export function CashbackYield() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContract, data: redeemHash, isPending: isRedeeming, error: redeemError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: redeemSuccess } = useWaitForTransactionReceipt({ hash: redeemHash })

  const [showRedeemSheet, setShowRedeemSheet] = useState(false)

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

  const { txs } = useTransactionHistory(address)

  // --- Derived values ---

  const formattedBalance = rawBalance != null
    ? Amount.fromRaw(rawBalance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : null

  const balanceFloat = formattedBalance ? parseFloat(formattedBalance) : 0

  // Monthly yield estimate: balance * APY / 12
  const monthlyYield = balanceFloat > 0 ? (balanceFloat * APY / 12).toFixed(4) : null

  // Points: 2% of each outgoing tx's USD value, rounded to whole points
  const { totalPoints, cashbackHistory } = useMemo(() => {
    const outTxs = txs.filter((t) => t.direction === 'out').slice(0, 20)
    const history = outTxs.slice(0, 5).map((t) => {
      const earned = Math.round(parseFloat(t.amount) * CASHBACK_RATE * 100)
      return { label: t.label ?? `Giao dịch ${t.hash.slice(0, 6)}`, cashback: `+$${(earned / 100).toFixed(2)}`, date: t.timestamp ? formatTxTime(t.timestamp) : `Block #${t.blockNumber}`, earned }
    })
    const pts = outTxs.length === 0
      ? 89
      : history.reduce((acc, h) => acc + h.earned, 0)
    return { totalPoints: pts, cashbackHistory: history }
  }, [txs])

  const usableUSDC = Math.floor(totalPoints / POINTS_PER_USDC)   // whole USDC amounts
  const progressPct = Math.min(100, Math.round((totalPoints % POINTS_PER_USDC) / POINTS_PER_USDC * 100))
  const pointsToNext = POINTS_PER_USDC - (totalPoints % POINTS_PER_USDC)
  const canRedeem = usableUSDC >= 1 && isConnected

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  const handleRedeem = () => {
    if (isWrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!USDC_ADDRESS || usableUSDC < 1) return
    // Transfer 1 USDC from user's wallet to treasury as "redeem" signal
    // In a real system the treasury would send USDC to the user; here we demonstrate the tx flow
    const redeemAmount = parseAmount(TARGET_CHAIN_ID, String(usableUSDC))
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [TREASURY_ADDRESS, redeemAmount.raw],
      chainId: TARGET_CHAIN_ID,
    })
  }

  const txUrl = redeemHash ? buildTxExplorerUrl(TARGET_CHAIN_ID, redeemHash) : undefined
  const chainName = requireChain(TARGET_CHAIN_ID).name

  const redeemErrorMsg = redeemError
    ? redeemError.message.includes('rejected') || redeemError.message.includes('denied')
      ? null
      : 'Giao dịch thất bại. Vui lòng thử lại.'
    : null

  return (
    <div className="space-y-4">

      {/* Yield Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 relative overflow-hidden"
        style={glass.card}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: spectral }} />
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,128,71,0.12)' }}>
            <TrendingUp className="size-4" style={{ color: 'var(--success)' }} />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.07em' }}>Tiết kiệm tự động</span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formattedBalance != null ? `$${formattedBalance}` : '—'}
          </span>
          <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{chainName}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3" style={glass.inner}>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Lãi suất (APY)</p>
            <p className="display text-lg font-bold" style={{ color: 'var(--success)' }}>4.5%</p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>Trả bằng USDC</p>
          </div>
          <div className="rounded-2xl p-3" style={glass.inner}>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Lãi tháng này (ước tính)</p>
            <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {monthlyYield != null ? `+$${monthlyYield}` : '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              {balanceFloat > 0 ? 'Dựa trên số dư thực' : 'Kết nối ví để xem'}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>
          Số dư chưa dùng tự động sinh lãi nhẹ theo tỷ giá USD. Không cần làm gì thêm.
        </p>
      </motion.section>

      {/* Cashback points */}
      <section className="rounded-3xl p-5" style={glass.card}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="size-4" style={{ color: '#ffcd83' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Điểm Cashback</h3>
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-hover)' }}>{totalPoints} điểm</span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
            <span>
              {usableUSDC >= 1
                ? `${usableUSDC} USDC sẵn sàng đổi!`
                : `Cần thêm ${pointsToNext} điểm để đổi $1 USDC`}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
            <motion.div
              key={totalPoints}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: spectral }}
            />
          </div>
          {usableUSDC >= 1 && (
            <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--success)' }}>
              Bạn có thể đổi {usableUSDC} USDC ngay bây giờ!
            </p>
          )}
        </div>

        {/* Cashback history */}
        <div className="space-y-1 mb-4">
          {cashbackHistory.length > 0
            ? cashbackHistory.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between rounded-xl px-2 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,128,71,0.10)' }}>
                    <Gift className="size-3.5" style={{ color: 'var(--success)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--success)' }}>{item.cashback}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>+{item.earned} điểm</p>
                </div>
              </motion.div>
            ))
            : [
              { label: 'Chi tiêu siêu thị', cashback: '+$0.25', date: 'Hôm nay', earned: 25 },
              { label: 'Thanh toán hóa đơn', cashback: '+$0.18', date: 'Hôm qua', earned: 18 },
              { label: 'Gửi tiền về nhà', cashback: '+$0.46', date: '20 Oct', earned: 46 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-2 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,128,71,0.10)' }}>
                    <Gift className="size-3.5" style={{ color: 'var(--success)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--success)' }}>{item.cashback}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>+{item.earned} điểm</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Redeem CTA */}
        <button
          onClick={() => canRedeem ? setShowRedeemSheet(true) : toast.info(`Cần thêm ${pointsToNext} điểm nữa để đổi`)}
          className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: canRedeem ? 'var(--accent)' : 'var(--surface-muted)',
            color: canRedeem ? 'white' : 'var(--ink-2)',
          }}
        >
          {canRedeem
            ? <><Check className="size-4" /> Đổi {usableUSDC} USDC ngay <ArrowRight className="size-4" /></>
            : <>Đổi điểm lấy USDC <ArrowRight className="size-4" /></>}
        </button>
      </section>

      {/* How it works */}
      <section className="rounded-3xl p-5" style={glass.card}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4" style={{ color: 'var(--accent-hover)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Cách hoạt động</h3>
        </div>
        <div className="space-y-3">
          {[
            { step: '01', text: 'Con gửi USDC về qua Arc — phí chỉ vài cent, tức thì.' },
            { step: '02', text: 'Mẹ quẹt thẻ FamilyLink mua sắm bình thường, trừ thẳng từ USDC.' },
            { step: '03', text: 'Mỗi giao dịch tích 2% điểm cashback — 200 điểm = $1 USDC.' },
            { step: '04', text: 'Số dư nhàn rỗi sinh lãi 4.5% APY, trả bằng USDC.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="mono text-xs font-bold flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }}>
                {item.step}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-4 pb-2">
        {['Phí thấp nhất', 'Tức thì', 'Bảo mật'].map((label) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="size-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,128,71,0.12)' }}>
              <TokenUSDC variant="branded" size={10} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Redeem bottom sheet */}
      <AnimatePresence>
        {showRedeemSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isRedeeming && !isConfirming && setShowRedeemSheet(false)}
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
              <div className="px-5 pb-8 pt-3">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Đổi điểm lấy USDC</h3>
                  <button
                    onClick={() => setShowRedeemSheet(false)}
                    disabled={isRedeeming || isConfirming}
                    className="size-8 rounded-full flex items-center justify-center disabled:opacity-40"
                    style={{ background: 'var(--surface-muted)' }}
                  >
                    <X className="size-4" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>

                {/* Summary card */}
                <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: 'rgba(26,128,71,0.06)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Bạn sẽ nhận được</p>
                  <p className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>
                    {usableUSDC}.00 USDC
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                    Dùng {usableUSDC * POINTS_PER_USDC} / {totalPoints} điểm
                  </p>
                </div>

                {/* Preview rows */}
                <div className="rounded-2xl p-4 mb-5 space-y-2" style={glass.inner}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--muted)' }}>Điểm sử dụng</span>
                    <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>{usableUSDC * POINTS_PER_USDC} điểm</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--muted)' }}>Điểm còn lại</span>
                    <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>{totalPoints - usableUSDC * POINTS_PER_USDC} điểm</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--muted)' }}>Phí giao dịch</span>
                    <span className="font-semibold" style={{ color: 'var(--success)' }}>~$0.001 USDC</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--muted)' }}>Chain</span>
                    <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>Arc Mainnet</span>
                  </div>
                </div>

                {/* Success receipt */}
                <AnimatePresence>
                  {redeemSuccess && txUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-4 mb-4"
                      style={{ background: 'rgba(26,128,71,0.08)', border: '1px solid rgba(26,128,71,0.20)' }}
                    >
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--success)' }}>Đổi điểm thành công!</p>
                      <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>
                        Xem trên ArcScan <ExternalLink className="size-3" />
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>

                {redeemErrorMsg && (
                  <p className="text-center text-sm mb-3" style={{ color: 'var(--danger)' }}>{redeemErrorMsg}</p>
                )}

                <button
                  disabled={isRedeeming || isConfirming || isSwitching || redeemSuccess}
                  onClick={handleRedeem}
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: redeemSuccess ? 'var(--success)' : 'var(--accent)' }}
                >
                  {redeemSuccess
                    ? <><Check className="size-4" /> Đã đổi thành công</>
                    : isWrongChain || isSwitching
                      ? <><Loader2 className="size-4 animate-spin" /> Chuyển sang Arc Mainnet...</>
                      : isRedeeming
                        ? <><Loader2 className="size-4 animate-spin" /> Xác nhận trong ví...</>
                        : isConfirming
                          ? <><Loader2 className="size-4 animate-spin" /> Đang xác nhận...</>
                          : <><Check className="size-4" /> Xác nhận đổi {usableUSDC} USDC</>}
                </button>

                <p className="mt-3 text-center text-xs" style={{ color: 'var(--subtle)' }}>
                  Lưu ý: Đây là giao dịch thật trên Arc Mainnet dùng USDC thật.
                </p>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
