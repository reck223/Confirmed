'use client'
import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { addTransaction, deleteTransaction } from './actions'

type Txn = {
  id: string; txn_date: string; amount: number; type: 'income' | 'expense'
  category: string; description: string | null; created_at: string
}

const INCOME_CATS  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income']
const EXPENSE_CATS = ['Food & Dining', 'Transport', 'Housing', 'Health', 'Shopping', 'Entertainment', 'Bills', 'Personal', 'Other']

const CAT_COLORS: Record<string, string> = {
  'Salary': '#22c55e', 'Freelance': '#4ade80', 'Investment': '#D4AF37', 'Gift': '#c084fc', 'Other Income': '#38bdf8',
  'Food & Dining': '#f97316', 'Transport': '#3b82f6', 'Housing': '#8b5cf6', 'Health': '#22c55e',
  'Shopping': '#f43f5e', 'Entertainment': '#e879f9', 'Bills': '#f59e0b', 'Personal': '#14b8a6', 'Other': '#6b7280',
}
function catColor(c: string) { return CAT_COLORS[c] ?? '#6b7280' }

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const INP: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 11, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none',
}
const LBL: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }

export function BudgetClient({
  transactions: initTxns,
  currentMonth,
  today,
}: {
  transactions: Txn[]
  currentMonth: string
  today: string
}) {
  const [txns, setTxns]       = useState(initTxns)
  const [month, setMonth]     = useState(currentMonth)
  const [showForm, setShowForm] = useState(false)
  const [, startT]            = useTransition()

  // Form state
  const [txnType, setTxnType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount]   = useState('')
  const [category, setCategory] = useState('Food & Dining')
  const [description, setDesc]  = useState('')
  const [txnDate, setTxnDate]   = useState(today)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const monthTxns = useMemo(() =>
    txns.filter(t => t.txn_date.startsWith(month)),
    [txns, month]
  )

  const income   = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = income - expenses

  // Category breakdown for expenses
  const catTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of monthTxns.filter(t => t.type === 'expense')) {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthTxns])

  // Group by date for transaction list
  const byDate = useMemo(() => {
    const map: Record<string, Txn[]> = {}
    for (const t of monthTxns) {
      if (!map[t.txn_date]) map[t.txn_date] = []
      map[t.txn_date].push(t)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthTxns])

  function resetForm() {
    setAmount(''); setCategory('Food & Dining'); setDesc(''); setTxnDate(today); setTxnType('expense')
  }

  function handleAdd() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    const fakeTxn: Txn = {
      id: `tmp-${Date.now()}`, txn_date: txnDate,
      amount: amt, type: txnType, category, description: description || null,
      created_at: new Date().toISOString(),
    }
    setTxns(prev => [fakeTxn, ...prev])
    resetForm(); setShowForm(false); setSaving(false)
    startT(async () => {
      await addTransaction(txnDate, amt, txnType, category, description)
    })
  }

  function handleDelete(id: string) {
    setDeleting(id)
    setTxns(prev => prev.filter(t => t.id !== id))
    startT(async () => {
      await deleteTransaction(id)
      setDeleting(null)
    })
  }

  const cats = txnType === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Budget</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{monthTxns.length} transaction{monthTxns.length !== 1 ? 's' : ''} this month</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: '11px 18px', borderRadius: 16, background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#D4AF37,#22c55e)', border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none', fontSize: 13, fontWeight: 900, color: showForm ? 'rgba(255,255,255,0.5)' : '#080808', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, animation: 'fadeUp 0.37s 0.07s ease both' }}>
        <button onClick={() => setMonth(m => addMonths(m, -1))} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 14px', color: '#EFEFEF', fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>‹</button>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF' }}>{monthLabel(month)}</p>
        <button onClick={() => setMonth(m => addMonths(m, 1))} disabled={month >= currentMonth} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 14px', color: month >= currentMonth ? 'rgba(255,255,255,0.2)' : '#EFEFEF', fontSize: 14, cursor: month >= currentMonth ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif' }}>›</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20, animation: 'fadeUp 0.38s 0.08s ease both' }}>
        {[
          { label: 'INCOME', value: income, color: '#22c55e' },
          { label: 'EXPENSES', value: expenses, color: '#f43f5e' },
          { label: 'NET', value: net, color: net >= 0 ? '#22c55e' : '#f43f5e' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 16, background: '#0d0d0d', border: `1px solid ${s.color}22`, padding: '14px 12px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>${fmtMoney(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', marginBottom: 20, animation: 'fadeUp 0.25s ease both' }}>
          {/* Income / Expense toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => { setTxnType(t); setCategory(t === 'income' ? 'Salary' : 'Food & Dining') }} style={{ padding: '10px 0', borderRadius: 12, background: txnType === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)') : 'rgba(255,255,255,0.04)', border: `1px solid ${txnType === t ? (t === 'income' ? 'rgba(34,197,94,0.4)' : 'rgba(244,63,94,0.4)') : 'rgba(255,255,255,0.07)'}`, fontSize: 13, fontWeight: 800, color: txnType === t ? (t === 'income' ? '#22c55e' : '#f43f5e') : 'rgba(255,255,255,0.35)', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Satoshi,sans-serif' }}>
                {t === 'income' ? '↑ Income' : '↓ Expense'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={LBL}>AMOUNT ($)</p>
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={INP} />
            </div>
            <div>
              <p style={LBL}>DATE</p>
              <input type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} style={{ ...INP, colorScheme: 'dark' }} />
            </div>
          </div>

          <p style={LBL}>CATEGORY</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {cats.map(c => {
              const col = catColor(c)
              const active = category === c
              return (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: '5px 10px', borderRadius: 8, background: active ? `${col}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? col + '50' : 'rgba(255,255,255,0.07)'}`, fontSize: 11, fontWeight: 700, color: active ? col : 'rgba(255,255,255,0.38)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {c}
                </button>
              )
            })}
          </div>

          <p style={LBL}>DESCRIPTION (optional)</p>
          <input value={description} onChange={e => setDesc(e.target.value)} placeholder="What was this for?" style={{ ...INP, marginBottom: 14 }} />

          <button onClick={handleAdd} disabled={!amount || parseFloat(amount) <= 0 || saving} style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: amount ? (txnType === 'income' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#f43f5e,#e11d48)') : 'rgba(255,255,255,0.04)', border: 'none', fontSize: 14, fontWeight: 900, color: amount ? '#fff' : 'rgba(255,255,255,0.2)', cursor: amount ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
            {saving ? 'ADDING…' : `ADD ${txnType.toUpperCase()}`}
          </button>
        </div>
      )}

      {/* Category breakdown */}
      {catTotals.length > 0 && (
        <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px', marginBottom: 20, animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>SPENDING BY CATEGORY</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catTotals.map(([cat, total]) => {
              const pct = expenses > 0 ? (total / expenses) * 100 : 0
              const col = catColor(cat)
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>{cat}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col, fontVariantNumeric: 'tabular-nums' }}>${fmtMoney(total)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction list */}
      {byDate.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>💰</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', marginBottom: 8 }}>No transactions yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>Start by adding your income and expenses for this month.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.42s 0.1s ease both' }}>
          {byDate.map(([date, group]) => (
            <div key={date}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: '0.04em' }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.map(t => {
                  const col = catColor(t.category)
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', opacity: deleting === t.id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 6px ${col}` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description || t.category}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{t.category}</p>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 900, color: t.type === 'income' ? '#22c55e' : '#f43f5e', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {t.type === 'income' ? '+' : '−'}${fmtMoney(t.amount)}
                      </span>
                      <button onClick={() => handleDelete(t.id)} disabled={!!deleting} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.16)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
