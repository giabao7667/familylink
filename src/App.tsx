import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, CreditCard, TrendingUp, Bell } from 'lucide-react'
import { SendMoney } from './components/SendMoney'
import { FamilyCard } from './components/FamilyCard'
import { CashbackYield } from './components/CashbackYield'

const TABS = [
  { id: 'send', label: 'Gửi tiền', Icon: Send },
  { id: 'card', label: 'Thẻ gia đình', Icon: CreditCard },
  { id: 'earn', label: 'Cashback', Icon: TrendingUp },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('send')
  const { isConnected } = useAccount()

  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #e8f3ff 0%, #fdf9f5 52%, #fff5ee 100%)' }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '5%', left: '0%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(133,177,237,0.20) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '0%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,205,131,0.22) 0%, transparent 70%)', filter: 'blur(64px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, borderRadius: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(175,143,244,0.10) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 pb-28 pt-5">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="size-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #122d45 0%, #1061a6 100%)' }}
            >
              FL
            </div>
            <div>
              <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>FamilyLink</span>
              <p className="text-xs -mt-0.5" style={{ color: 'var(--subtle)' }}>Kiều hối thế hệ mới</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                className="size-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.64)', border: '1px solid rgba(255,255,255,0.68)' }}
              >
                <Bell className="size-4" style={{ color: 'var(--muted)' }} />
              </button>
            )}
            <ConnectKitButton />
          </div>
        </header>

        {/* Hero banner (unconnected) */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 rounded-3xl p-5 overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #122d45 0%, #1061a6 100%)',
                boxShadow: '0 12px 40px rgba(18,45,69,0.22)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)' }} />
              <h2 className="display text-xl font-bold text-white mb-1">
                Gửi tiền về nhà<br />trong 1 giây
              </h2>
              <p className="text-sm text-white/70 mb-4 leading-relaxed">
                Phí chỉ vài cent • Tỷ giá chuẩn liên ngân hàng • Gia đình quẹt thẻ ngay
              </p>
              <div className="flex gap-3">
                {['Phí &lt;$0.01', 'Tức thì', 'Không crypto'].map((badge) => (
                  <span
                    key={badge}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                    dangerouslySetInnerHTML={{ __html: badge }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'send' && <SendMoney />}
            {activeTab === 'card' && <FamilyCard />}
            {activeTab === 'earn' && <CashbackYield />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-4 pt-2 px-4"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.68)',
        }}
      >
        <nav className="flex max-w-md w-full gap-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all"
                style={{
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--subtle)',
                }}
              >
                <Icon className="size-5" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
