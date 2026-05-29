'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './lib/firebase'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Entry = {
  money: string
  clips: string
}

type DayEntry = {
  day: number
  money: number
  clips: number
  hasData: boolean
}

export default function Home() {
  const now = new Date()

  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState(1)
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [moneyInput, setMoneyInput] = useState('')
  const [clipsInput, setClipsInput] = useState('')

  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState<'login' | 'signup' | 'logout' | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Saved')
  const [liveTime, setLiveTime] = useState('')

  const monthKey = month + '-' + year
  const selectedKey = monthKey + '-' + selectedDay

  useEffect(() => {
    const saved = localStorage.getItem('clip-tracker-data')
    if (saved) setEntries(JSON.parse(saved))

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const ref = doc(db, 'users', currentUser.uid)
        const snap = await getDoc(ref)

        if (snap.exists()) {
          const cloudData = snap.data().entries || {}
          setEntries(cloudData)
          localStorage.setItem('clip-tracker-data', JSON.stringify(cloudData))
        }

        setAuthMessage('')
      }
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    const tick = () => {
      setLiveTime(
        new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('clip-tracker-data', JSON.stringify(entries))

    if (user) {
      setDoc(doc(db, 'users', user.uid), { entries }, { merge: true })
    }
  }, [entries, user])

  const signUp = async () => {
    try {
      setAuthLoading('signup')
      setAuthMessage('')
      await createUserWithEmailAndPassword(auth, email, password)
      setAuthMessage('Account created.')
      setPassword('')
    } catch (error: any) {
      setAuthMessage(error.message)
    } finally {
      setAuthLoading(null)
    }
  }

  const logIn = async () => {
    try {
      setAuthLoading('login')
      setAuthMessage('')
      await signInWithEmailAndPassword(auth, email, password)
      setAuthMessage('Logged in.')
      setPassword('')
    } catch (error: any) {
      setAuthMessage(error.message)
    } finally {
      setAuthLoading(null)
    }
  }

  const logOut = async () => {
    try {
      setAuthLoading('logout')
      await signOut(auth)
      setUser(null)
      setAuthMessage('Logged out.')
    } finally {
      setAuthLoading(null)
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 35) cells.push(null)

  const getEntry = (day: number) => {
    return entries[monthKey + '-' + day] || { money: '', clips: '' }
  }

  const monthDayEntries: DayEntry[] = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const entry = entries[monthKey + '-' + day] || { money: '', clips: '' }

      return {
        day,
        money: Number(entry.money || 0),
        clips: Number(entry.clips || 0),
        hasData: entry.money !== '' || entry.clips !== '',
      }
    })
  }, [entries, monthKey, daysInMonth])

  const totalIncome = monthDayEntries.reduce((sum, item) => sum + item.money, 0)
  const totalClips = monthDayEntries.reduce((sum, item) => sum + item.clips, 0)
  const daysTracked = monthDayEntries.filter((item) => item.hasData).length
  const average = daysTracked > 0 ? totalIncome / daysTracked : 0

  const bestEntry = monthDayEntries.reduce(
    (best, item) => (item.money > best.money ? item : best),
    { day: 0, money: 0, clips: 0, hasData: false }
  )

  const positiveEntries = monthDayEntries.filter((item) => item.money > 0)
  const lowestEntry = positiveEntries.length
    ? positiveEntries.reduce((low, item) => (item.money < low.money ? item : low))
    : { day: 0, money: 0, clips: 0, hasData: false }

  const canSave = selectedDay && (moneyInput !== '' || clipsInput !== '')

  const saveDay = async () => {
    if (!canSave) return

    setSaveLoading(true)
    setSaveMessage('Saving')

    setEntries({
      ...entries,
      [selectedKey]: {
        money: moneyInput,
        clips: clipsInput,
      },
    })

    setTimeout(() => {
      setSaveLoading(false)
      setSaveMessage('Saved')
    }, 400)
  }

  const clearDay = () => {
    const updated = { ...entries }
    delete updated[selectedKey]
    setEntries(updated)
    setMoneyInput('')
    setClipsInput('')
    setSaveMessage('Cleared')
  }

  const selectDay = (day: number) => {
    const entry = getEntry(day)
    setSelectedDay(day)
    setMoneyInput(entry.money)
    setClipsInput(entry.clips)
  }

  const goToday = () => {
    setMonth(now.getMonth())
    setYear(now.getFullYear())
    selectDay(now.getDate())
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="min-h-screen grid grid-cols-[220px_1fr]">

        <aside className="relative border-r border-green-500/40 bg-[#020202] p-6 flex flex-col justify-between shadow-[0_0_50px_rgba(34,197,94,0.22)]">
          <div className="absolute right-0 top-0 h-full w-px bg-green-400 shadow-[0_0_25px_rgba(34,197,94,0.9)]" />

          <div>
            <div className="mb-10">
              <div className="w-16 h-12 border-2 border-green-400 rounded-md mb-5 shadow-[0_0_24px_rgba(34,197,94,0.75)] flex items-center justify-center">
                <div className="w-10 h-6 border border-green-400 rounded-sm shadow-[0_0_14px_rgba(34,197,94,0.5)]" />
              </div>

              <div className="text-3xl font-black leading-none">DIRECTOR'S</div>
              <div className="text-4xl font-black leading-none text-green-400 drop-shadow-[0_0_14px_rgba(34,197,94,0.85)]">
                CUT
              </div>
              <div className="text-sm text-zinc-300 mt-5 tracking-[0.2em]">CLIP TRACKER</div>
              <div className="text-sm text-green-400 font-black mt-1">MONEY MADE.</div>
            </div>

            <div className="space-y-3">
              <NavButton active label="Dashboard" />
              <NavButton label="Calendar" />
              <NavButton label="Stats" />
              <NavButton label="Analytics" />
              <NavButton label="Settings" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-zinc-800 bg-[#050505] rounded-xl p-4">
              <div className="text-green-400 text-xs font-black">● LIVE DATA</div>
              <div className="text-zinc-300 mt-2">{liveTime}</div>
              <div className="text-xs text-green-400 mt-2">Firebase Connected</div>
            </div>

            <div className="border border-zinc-800 bg-[#050505] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-green-500 bg-green-500/10 text-green-400 flex items-center justify-center font-black">
                  {user?.email ? user.email[0].toUpperCase() : 'A'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {user?.email ? user.email.split('@')[0] : 'Creator'}
                  </div>
                  <div className="text-xs text-green-400">
                    {user ? 'Creator Account' : 'Logged out'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="p-6 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_35%)]">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-3xl font-black tracking-[0.28em]">CLIP TRACKER</div>
              <div className="text-zinc-500 text-sm mt-1">
                Track your clips. Track your income. Track your growth.
              </div>
            </div>

            <div className="flex gap-3">
              <div className="border border-green-500/30 rounded-xl px-5 py-3 bg-[#050505] shadow-[0_0_20px_rgba(34,197,94,0.18)]">
                <span className="text-green-400">●</span> {saveMessage}
              </div>
              <button className="border border-zinc-800 rounded-xl px-4 py-3 bg-[#050505]">
                ⚙
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-5">
            <TopStatCard title="TOTAL INCOME" value={`$${totalIncome.toLocaleString()}`} color="green" icon="$" small="+ 12.5% vs last month" />
            <TopStatCard title="TOTAL CLIPS" value={totalClips.toLocaleString()} color="purple" icon="◉" small="+ 8.7% vs last month" />
            <TopStatCard title="AVG PER DAY" value={`$${Math.round(average).toLocaleString()}`} color="blue" icon="↗" small="+ 15.3% vs last month" />
            <TopStatCard title="BEST DAY" value={`$${bestEntry.money.toLocaleString()}`} color="green" icon="★" small={bestEntry.day ? `${months[month]} ${bestEntry.day}, ${year}` : '-'} />
            <TopStatCard title="LOWEST DAY" value={`$${lowestEntry.money.toLocaleString()}`} color="red" icon="↓" small={lowestEntry.day ? `${months[month]} ${lowestEntry.day}, ${year}` : '-'} />
          </div>

          <div className="border border-green-500/25 bg-[#050505] rounded-2xl p-5 mb-5 shadow-[0_0_32px_rgba(34,197,94,0.12)]">
            <div className="flex items-end justify-between gap-5">
              <div className="grid grid-cols-2 gap-5 flex-1">
                <div>
                  <div className="text-zinc-400 text-sm mb-2 tracking-[0.15em]">MONTH</div>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full bg-black border border-green-500/25 rounded-xl px-5 py-4 text-white outline-none focus:border-green-400 focus:shadow-[0_0_18px_rgba(34,197,94,0.25)]"
                  >
                    {months.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-zinc-400 text-sm mb-2 tracking-[0.15em]">YEAR</div>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-black border border-green-500/25 rounded-xl px-5 py-4 text-white outline-none focus:border-green-400 focus:shadow-[0_0_18px_rgba(34,197,94,0.25)]"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={goToday}
                className="min-w-40 bg-green-500/10 border border-green-500/50 rounded-xl px-5 py-4 font-black text-green-300 shadow-[0_0_22px_rgba(34,197,94,0.22)] hover:bg-green-500/15"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_340px] gap-5">
            <div>
              <div className="border border-zinc-800 bg-[#050505] rounded-2xl p-6 shadow-[0_0_35px_rgba(34,197,94,0.08)]">
                <h1 className="text-4xl font-black mb-6">
                  <span className="text-green-400">{months[month].toUpperCase()}</span> {year}
                </h1>

                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-zinc-400 font-bold">
                  <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div>
                  <div>THU</div><div>FRI</div><div>SAT</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {cells.map((day, i) => {
                    if (day === null) {
                      return (
                        <div
                          key={'empty-' + i}
                          className="h-28 bg-[#070707] border border-zinc-900 rounded-xl opacity-40"
                        />
                      )
                    }

                    const entry = getEntry(day)
                    const money = Number(entry.money || 0)
                    const isSelected = selectedDay === day

                    let cardClass = 'h-28 bg-[#070707] rounded-xl p-4 text-left border transition-all '

                    if (isSelected) cardClass += 'border-green-400 shadow-[0_0_14px_rgba(34,197,94,0.9),0_0_36px_rgba(34,197,94,0.45)]'
                    else if (money > 0) cardClass += 'border-green-900'
                    else cardClass += 'border-zinc-800'

                    return (
                      <button
                        key={'day-' + day}
                        onClick={() => selectDay(day)}
                        className={cardClass}
                      >
                        <div className="text-2xl font-black text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.7)] truncate">
                          ${money.toLocaleString()}
                        </div>
                        <div className="mt-3 text-sm font-bold text-white">
                          Day {day}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {entry.clips || 0} clips
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5">
                <IncomeTrendChart data={monthDayEntries} month={month} />
                <PlatformBreakdown totalClips={totalClips} />
              </div>
            </div>

            <aside className="space-y-5">
              <div className="bg-[#050505] border border-zinc-800 rounded-2xl p-5">
                <div className="text-xl font-black mb-4">Account</div>

                {user ? (
                  <>
                    <div className="text-green-400 font-bold mb-2">● Logged in</div>
                    <div className="text-zinc-300 text-sm break-all mb-4">{user.email}</div>
                    <button
                      onClick={logOut}
                      disabled={authLoading === 'logout'}
                      className="w-full bg-red-950 border border-red-700 text-red-400 rounded-xl p-3 font-bold"
                    >
                      {authLoading === 'logout' ? 'Logging out...' : 'Logout'}
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 mb-3"
                    />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      type="password"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 mb-3"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={logIn} disabled={authLoading !== null} className="bg-green-500 text-black rounded-xl p-3 font-bold">
                        {authLoading === 'login' ? 'Logging in...' : 'Login'}
                      </button>
                      <button onClick={signUp} disabled={authLoading !== null} className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 font-bold">
                        {authLoading === 'signup' ? 'Signing up...' : 'Sign Up'}
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-3 break-all">{authMessage}</div>
                  </>
                )}
              </div>

              <div className="bg-[#050505] border border-zinc-800 rounded-2xl p-5">
                <div className="text-xl font-black mb-4">QUICK STATS</div>
                <div className="space-y-3 text-zinc-300">
                  <div className="flex justify-between"><span>Days Tracked</span><span>{daysTracked}/{daysInMonth}</span></div>
                  <div className="flex justify-between"><span>Total Clips</span><span>{totalClips.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Total Income</span><span>${totalIncome.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>This Month</span><span className="text-green-400">{months[month]} {year}</span></div>
                </div>
                <button className="w-full mt-5 border border-green-500/40 text-green-400 rounded-xl p-3 font-bold hover:bg-green-500/10">
                  View Full Analytics →
                </button>
              </div>

              <div className="bg-[#050505] border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-xl font-black mb-4">ADD / EDIT DAY</h2>

                <div className="space-y-4">
                  <div>
                    <div className="text-zinc-400 text-sm mb-2">Date</div>
                    <div className="bg-black border border-zinc-800 rounded-xl p-3">
                      {months[month]} {selectedDay}, {year}
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-400 text-sm mb-2">Money Made ($)</div>
                    <input
                      value={moneyInput}
                      onChange={(e) => setMoneyInput(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3"
                    />
                  </div>

                  <div>
                    <div className="text-zinc-400 text-sm mb-2">Clips Made</div>
                    <input
                      value={clipsInput}
                      onChange={(e) => setClipsInput(e.target.value)}
                      placeholder="0"
                      type="number"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3"
                    />
                  </div>

                  <button
                    onClick={saveDay}
                    disabled={!canSave || saveLoading}
                    className={`w-full rounded-xl p-4 font-black ${
                      canSave
                        ? 'bg-green-500/15 border border-green-500 text-green-300 shadow-[0_0_22px_rgba(34,197,94,0.35)]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {saveLoading ? 'Saving...' : 'Save Day'}
                  </button>

                  <button
                    onClick={clearDay}
                    className="w-full bg-red-950/60 border border-red-700 text-red-400 rounded-xl p-4 font-black shadow-[0_0_20px_rgba(239,68,68,0.14)]"
                  >
                    Clear Day
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}

function NavButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`relative w-full rounded-xl p-4 text-left font-bold transition ${
        active
          ? 'bg-green-500/15 border border-green-500 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.32)]'
          : 'text-zinc-300 hover:text-white'
      }`}
    >
      {label}
      {active && <span className="absolute -right-6 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-green-400 shadow-[0_0_18px_rgba(34,197,94,1)]" />}
    </button>
  )
}

function TopStatCard({
  title,
  value,
  color,
  icon,
  small,
}: {
  title: string
  value: string
  color: 'green' | 'purple' | 'blue' | 'red'
  icon: string
  small: string
}) {
  const styles = {
    green: {
      card: 'border-green-500/50 text-green-400 shadow-[0_0_34px_rgba(34,197,94,0.24)]',
      icon: 'border-green-400 bg-green-500/15 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.75)]',
    },
    purple: {
      card: 'border-purple-500/50 text-purple-400 shadow-[0_0_34px_rgba(168,85,247,0.22)]',
      icon: 'border-purple-400 bg-purple-500/15 text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.7)]',
    },
    blue: {
      card: 'border-blue-500/50 text-blue-400 shadow-[0_0_34px_rgba(59,130,246,0.22)]',
      icon: 'border-blue-400 bg-blue-500/15 text-blue-300 shadow-[0_0_24px_rgba(59,130,246,0.7)]',
    },
    red: {
      card: 'border-red-500/50 text-red-400 shadow-[0_0_34px_rgba(239,68,68,0.22)]',
      icon: 'border-red-400 bg-red-500/15 text-red-300 shadow-[0_0_24px_rgba(239,68,68,0.65)]',
    },
  }

  return (
    <div className={`bg-[#050505] border rounded-2xl p-5 min-h-36 ${styles[color].card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-zinc-400 text-sm">{title}</div>
          <div className="text-3xl font-black mt-3 truncate">{value}</div>
        </div>

        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl font-black ${styles[color].icon}`}>
          {icon}
        </div>
      </div>

      <MiniSparkline color={color} />
      <div className="text-sm mt-3 opacity-90">{small}</div>
    </div>
  )
}

function MiniSparkline({ color }: { color: 'green' | 'purple' | 'blue' | 'red' }) {
  const stroke = {
    green: '#22c55e',
    purple: '#a855f7',
    blue: '#3b82f6',
    red: '#ef4444',
  }[color]

  return (
    <svg viewBox="0 0 180 34" className="mt-3 h-9 w-full">
      <path
        d="M0 24 C18 12, 30 28, 50 17 S82 7, 105 18 S130 30, 150 13 S170 8, 180 14"
        fill="none"
        stroke={stroke}
        strokeWidth="6"
        opacity="0.18"
      />
      <path
        d="M0 24 C18 12, 30 28, 50 17 S82 7, 105 18 S130 30, 150 13 S170 8, 180 14"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
      />
    </svg>
  )
}

function IncomeTrendChart({
  data,
  month,
}: {
  data: DayEntry[]
  month: number
}) {
  const max = Math.max(...data.map((d) => d.money), 1)
  const roundedMax = Math.ceil(max / 1000000) * 1000000 || max
  const midValue = roundedMax / 2

  const chartWidth = 520
  const chartHeight = 150

  const points = data
    .map((d, index) => {
      const x = 50 + (index / Math.max(data.length - 1, 1)) * chartWidth
      const y = 20 + chartHeight - (d.money / roundedMax) * chartHeight
      return `${x},${y}`
    })
    .join(' ')

  const best = data.reduce(
    (top, item) => (item.money > top.money ? item : top),
    { day: 0, money: 0, clips: 0, hasData: false }
  )

  const bestIndex = Math.max(best.day - 1, 0)
  const bestX = 50 + (bestIndex / Math.max(data.length - 1, 1)) * chartWidth
  const bestY = 20 + chartHeight - (best.money / roundedMax) * chartHeight

  const dateLabels = [1, 5, 10, 15, 20, 25, data.length].filter(
    (day, index, arr) => day <= data.length && arr.indexOf(day) === index
  )

  const formatMoneyShort = (value: number) => {
    if (value >= 1000000) return `$${Math.round(value / 1000000)}M`
    if (value >= 1000) return `$${Math.round(value / 1000)}K`
    return `$${Math.round(value)}`
  }

  return (
    <div className="border border-green-500/20 bg-[#050505] rounded-2xl p-6 h-72 shadow-[0_0_30px_rgba(34,197,94,0.12)]">
      <div className="flex justify-between mb-4">
        <div>
          <div className="text-xl font-black tracking-[0.15em]">INCOME TREND</div>
          <div className="text-zinc-500 text-sm mt-1">{months[month]} performance</div>
        </div>
        <div className="text-xs border border-green-500/30 text-green-400 rounded-lg px-3 py-2 bg-green-500/5">
          This Month
        </div>
      </div>

      <div className="relative h-48">
        <svg viewBox="0 0 600 220" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>

            <filter id="greenGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1="50" y1="20" x2="570" y2="20" stroke="#27272a" strokeDasharray="4 6" />
          <line x1="50" y1="95" x2="570" y2="95" stroke="#27272a" strokeDasharray="4 6" />
          <line x1="50" y1="170" x2="570" y2="170" stroke="#27272a" strokeDasharray="4 6" />

          <text x="0" y="24" fill="#71717a" fontSize="13">{formatMoneyShort(roundedMax)}</text>
          <text x="0" y="99" fill="#71717a" fontSize="13">{formatMoneyShort(midValue)}</text>
          <text x="0" y="174" fill="#71717a" fontSize="13">$0</text>

          <polygon points={`50,170 ${points} 570,170`} fill="url(#incomeFill)" />

          <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="9" opacity="0.16" />
          <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="4" filter="url(#greenGlow)" />

          {best.day > 0 && (
            <>
              <circle cx={bestX} cy={bestY} r="8" fill="#22c55e" filter="url(#greenGlow)" />
              <circle cx={bestX} cy={bestY} r="4" fill="#bbf7d0" />
            </>
          )}

          {dateLabels.map((day) => {
            const x = 50 + ((day - 1) / Math.max(data.length - 1, 1)) * chartWidth
            return (
              <text key={day} x={x - 14} y="210" fill="#71717a" fontSize="13">
                {months[month].slice(0, 3)} {day}
              </text>
            )
          })}
        </svg>

        {best.day > 0 && (
          <div
            className="absolute bg-black border border-green-500/40 rounded-xl p-3 text-xs shadow-[0_0_22px_rgba(34,197,94,0.35)]"
            style={{
              left: `${Math.min(Math.max((bestX / 600) * 100, 12), 72)}%`,
              top: `${Math.min(Math.max((bestY / 220) * 100 - 12, 8), 55)}%`,
            }}
          >
            <div className="text-zinc-300">{months[month].slice(0, 3)} {best.day}</div>
            <div className="text-green-400 font-black">${best.money.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformBreakdown({ totalClips }: { totalClips: number }) {
  return (
    <div className="border border-zinc-800 bg-[#050505] rounded-2xl p-6 h-72">
      <div className="text-xl font-black tracking-[0.15em] mb-5">PLATFORM BREAKDOWN</div>

      <div className="flex gap-7 items-center">
        <div className="relative w-32 h-32 rounded-full bg-[conic-gradient(#22c55e_0deg_180deg,#a855f7_180deg_270deg,#3b82f6_270deg_330deg,#ffffff_330deg_360deg)] shadow-[0_0_25px_rgba(34,197,94,0.2)]">
          <div className="absolute inset-4 rounded-full bg-black flex flex-col items-center justify-center">
            <div className="text-2xl font-black">{totalClips.toLocaleString()}</div>
            <div className="text-zinc-500 text-xs">Clips</div>
          </div>
        </div>

        <div className="flex-1 space-y-3 text-sm">
          <PlatformRow name="TikTok" percent="52%" color="bg-green-400" />
          <PlatformRow name="Instagram" percent="27%" color="bg-purple-500" />
          <PlatformRow name="YouTube" percent="15%" color="bg-blue-500" />
          <PlatformRow name="X" percent="6%" color="bg-white" />
        </div>
      </div>
    </div>
  )
}

function PlatformRow({
  name,
  percent,
  color,
}: {
  name: string
  percent: string
  color: string
}) {
  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span>{name}</span>
      </div>
      <span>{percent}</span>
    </div>
  )
}