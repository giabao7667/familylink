import { useEffect, useState } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arc } from 'viem/chains'
import { getUsdc, buildTxExplorerUrl, requireChain } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

const TARGET_CHAIN_ID = 5042 // Arc Mainnet
const LOOKBACK_BLOCKS = 5000n

export interface TxRecord {
  hash: string
  from: string
  to: string
  amount: string        // formatted USDC, e.g. "12.50"
  direction: 'in' | 'out'
  blockNumber: bigint
  timestamp: number     // unix ms, 0 if unknown
  explorerUrl: string
  source: 'onchain' | 'mock'
  label?: string        // merchant label for mock entries
}

const MOCK_TXS: TxRecord[] = [
  { hash: 'mock-1', from: '0x0000000000000000000000000000000000000001', to: '0x0000000000000000000000000000000000000002', amount: '12.50', direction: 'out', blockNumber: 0n, timestamp: Date.now() - 3 * 60 * 60 * 1000, explorerUrl: '', source: 'mock', label: 'Siêu thị VinMart' },
  { hash: 'mock-2', from: '0x0000000000000000000000000000000000000001', to: '0x0000000000000000000000000000000000000003', amount: '8.00', direction: 'out', blockNumber: 0n, timestamp: Date.now() - 24 * 60 * 60 * 1000, explorerUrl: '', source: 'mock', label: 'Phòng khám Medic' },
  { hash: 'mock-3', from: '0x0000000000000000000000000000000000000001', to: '0x0000000000000000000000000000000000000004', amount: '18.30', direction: 'out', blockNumber: 0n, timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, explorerUrl: '', source: 'mock', label: 'Tiền điện tháng 10' },
  { hash: 'mock-4', from: '0x0000000000000000000000000000000000000001', to: '0x0000000000000000000000000000000000000005', amount: '6.20', direction: 'out', blockNumber: 0n, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, explorerUrl: '', source: 'mock', label: 'Chợ Bến Thành' },
]

function formatRelativeTime(tsMs: number): string {
  if (!tsMs) return ''
  const diff = Date.now() - tsMs
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'Vừa xong'
  if (hours < 1) return `${mins} phút trước`
  if (hours < 24) return `Hôm nay, ${new Date(tsMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  if (days === 1) return `Hôm qua, ${new Date(tsMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  return new Date(tsMs).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
}

export function formatTxTime(tsMs: number): string {
  return formatRelativeTime(tsMs)
}

export function useTransactionHistory(address: `0x${string}` | undefined) {
  const [txs, setTxs] = useState<TxRecord[]>(MOCK_TXS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return

    const usdcFact = getUsdc(TARGET_CHAIN_ID)
    if (!usdcFact) return

    const chain = requireChain(TARGET_CHAIN_ID)
    const rpcUrl = chain.rpcUrls[0]

    const client = createPublicClient({
      chain: arc,
      transport: http(rpcUrl),
    })

    let cancelled = false

    async function fetch() {
      if (!cancelled) { setLoading(true); setError(null) }
      try {
        const head = await client.getBlockNumber()
        const fromBlock = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n

        const [sentLogs, receivedLogs] = await Promise.all([
          client.getLogs({
            address: usdcFact!.address as `0x${string}`,
            event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
            args: { from: address },
            fromBlock,
            toBlock: head,
          }),
          client.getLogs({
            address: usdcFact!.address as `0x${string}`,
            event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
            args: { to: address },
            fromBlock,
            toBlock: head,
          }),
        ])

        if (cancelled) return

        // Fetch block timestamps for unique block numbers
        const allLogs = [...sentLogs, ...receivedLogs]
        const uniqueBlocks = [...new Set(allLogs.map((l) => l.blockNumber).filter(Boolean))] as bigint[]
        const blockTimes: Record<string, number> = {}
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const block = await client.getBlock({ blockNumber: bn })
              blockTimes[bn.toString()] = Number(block.timestamp) * 1000
            } catch {
              blockTimes[bn.toString()] = 0
            }
          })
        )

        if (cancelled) return

        const decimals = usdcDecimalsFor(TARGET_CHAIN_ID)
        type TransferLog = (typeof sentLogs)[number]

        const toRecord = (log: TransferLog, direction: 'in' | 'out'): TxRecord => {
          const from = (log.args.from ?? '') as string
          const to = (log.args.to ?? '') as string
          const value = (log.args.value ?? 0n)
          const amount = Amount.fromRaw(value, decimals).toFixed(2)
          const ts = log.blockNumber ? (blockTimes[log.blockNumber.toString()] ?? 0) : 0
          return {
            hash: log.transactionHash ?? '',
            from,
            to,
            amount,
            direction,
            blockNumber: log.blockNumber ?? 0n,
            timestamp: ts,
            explorerUrl: log.transactionHash ? buildTxExplorerUrl(TARGET_CHAIN_ID, log.transactionHash) : '',
            source: 'onchain',
          }
        }

        const onchainTxs: TxRecord[] = [
          ...sentLogs.map((l) => toRecord(l, 'out')),
          ...receivedLogs.map((l) => toRecord(l, 'in')),
        ]

        // Merge: onchain first, then mock (deduplicated by hash)
        const onchainHashes = new Set(onchainTxs.map((t) => t.hash))
        const merged = [
          ...onchainTxs,
          ...MOCK_TXS.filter((t) => !onchainHashes.has(t.hash)),
        ].sort((a, b) => {
          // Sort onchain by blockNumber desc, mock by timestamp desc
          if (a.source === 'onchain' && b.source === 'onchain') return Number(b.blockNumber - a.blockNumber)
          return b.timestamp - a.timestamp
        })

        setTxs(merged.length > 0 ? merged : MOCK_TXS)
      } catch {
        if (!cancelled) {
          setError('Không thể tải lịch sử giao dịch')
          setTxs(MOCK_TXS)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetch()
    return () => { cancelled = true }
  }, [address])

  return { txs, loading, error }
}
