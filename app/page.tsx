'use client'

import { useEffect, useState } from 'react'
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
      }
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    localStorage.setItem('clip-tracker-data', JSON.stringify(entries))

    if (user) {
      setDoc(doc(db, 'users', user.uid), { entries }, { merge: true })
    }
  }, [entries, user])

  const signUp = async () => {
    try {
      setAuthMessage('')
      await createUserWithEmailAndPassword(auth, email, password)
      setAuthMessage('Account created.')
    } catch (error: any) {
      setAuthMessage(error.message)
    }
  }

  const logIn = async () => {
    try {
      setAuthMessage('')
      await signInWithEmailAndPassword(auth, email, password)
      setAuthMessage('Logged in.')
    } catch (error: any) {
      setAuthMessage(error.message)
    }
  }

  const logOut = async () => {
    await signOut(auth)
    setUser(null)
    setAuthMessage('Logged out.')
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

  const monthEntries = Object.keys(entries)
    .filter((key) => key.startsWith(monthKey + '-'))
    .map((key) => entries[key])

  const totalIncome = monthEntries.reduce(
    (sum, item) => sum + Number(item.money || 0),
    0
  )

  const totalClips = monthEntries.reduce(
    (sum, item) => sum + Number(item.clips || 0),
    0
  )

  const daysTracked = monthEntries.filter(
    (item) => item.money !== '' || item.clips !== ''
  ).length

  const average = daysTracked > 0 ? totalIncome / daysTracked : 0

  const bestDay = monthEntries.length
    ? Math.max(...monthEntries.map((item) => Number(item.money || 0)))
    : 0

  const saveDay = () => {
    setEntries({
      ...entries,
      [selectedKey]: {
        money: moneyInput,
        clips: clipsInput,
      },
    })
  }

  const clearDay = () => {
    const updated = { ...entries }
    delete updated[selectedKey]
    setEntries(updated)
    setMoneyInput('')
    setClipsInput('')
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
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[1600px] mx-auto grid grid-cols-[220px_1fr_320px] gap-6">

        <aside className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6 flex flex-col justify-between min-h-[92vh]">
          <div>
            <h1 className="text-4xl font-black text-green-400">CLIP</h1>
            <h2 className="text-4xl font-black">TRACKER</h2>
            <p className="text-zinc-500 mt-2">Money Made.</p>

            <div className="mt-10 space-y-3">
              <button className="w-full bg-green-500 text-black rounded-2xl p-4 font-bold">
                Dashboard
              </button>
              <button className="w-full border border-zinc-800 rounded-2xl p-4">
                Calendar
              </button>
              <button className="w-full border border-zinc-800 rounded-2xl p-4">
                Stats
              </button>
              <button className="w-full border border-zinc-800 rounded-2xl p-4">
                Settings
              </button>
            </div>
          </div>

          <div className="bg-black border border-green-500 rounded-3xl p-5">
            <div className="text-zinc-500 text-sm">TOTAL INCOME</div>
            <div className="text-3xl font-black text-green-400 mt-3 truncate">
              ${totalIncome.toLocaleString()}
            </div>
          </div>
        </aside>

        <section>
          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6 mb-6">
            <div className="flex justify-between gap-4">
              <div className="flex gap-4">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-black border border-zinc-800 rounded-2xl px-5 py-3"
                >
                  {months.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-black border border-zinc-800 rounded-2xl px-5 py-3"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={goToday}
                className="bg-black border border-zinc-800 rounded-2xl px-6"
              >
                Today
              </button>
            </div>
          </div>

          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6">
            <h1 className="text-6xl font-black mb-8">
              {months[month].toUpperCase()} {year}
            </h1>

            <div className="grid grid-cols-7 gap-3 mb-3 text-center text-zinc-500 font-bold">
              <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div>
              <div>THU</div><div>FRI</div><div>SAT</div>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {cells.map((day, i) => {
                if (day === null) {
                  return (
                    <div
                      key={'empty-' + i}
                      className="h-32 bg-black border border-zinc-900 rounded-2xl opacity-40"
                    />
                  )
                }

                const entry = getEntry(day)
                const money = Number(entry.money || 0)
                const isSelected = selectedDay === day

                let cardClass = 'h-32 bg-black rounded-2xl p-4 text-left border transition-all '

                if (isSelected) cardClass += 'border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.45)]'
                else if (money > 0) cardClass += 'border-green-900'
                else if (money < 0) cardClass += 'border-red-900'
                else cardClass += 'border-zinc-900'

                return (
                  <button
                    key={'day-' + day}
                    onClick={() => selectDay(day)}
                    className={cardClass}
                  >
                    <div className="text-3xl font-black">{day}</div>
                    <div className="mt-3 text-green-400 font-bold">
                      ${money.toLocaleString()}
                    </div>
                    <div className="text-zinc-500 text-sm">
                      {entry.clips || 0} clips
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 bg-black border border-zinc-900 rounded-[30px] p-6">
              <h2 className="text-3xl font-black mb-4">
                ADD / EDIT DAY {selectedDay}
              </h2>

              <div className="grid grid-cols-4 gap-4">
                <input
                  value={moneyInput}
                  onChange={(e) => setMoneyInput(e.target.value)}
                  placeholder="Money Made"
                  type="number"
                  className="bg-[#050505] border border-zinc-800 rounded-2xl p-4"
                />

                <input
                  value={clipsInput}
                  onChange={(e) => setClipsInput(e.target.value)}
                  placeholder="Clips Made"
                  type="number"
                  className="bg-[#050505] border border-zinc-800 rounded-2xl p-4"
                />

                <button
                  onClick={saveDay}
                  className="bg-green-500 text-black rounded-2xl font-black"
                >
                  Save Day
                </button>

                <button
                  onClick={clearDay}
                  className="bg-red-950 border border-red-700 text-red-400 rounded-2xl font-black"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6">
            {user ? (
              <>
                <div className="text-green-400 font-bold mb-3">Logged in</div>
                <div className="text-zinc-400 text-sm break-all mb-4">{user.email}</div>
                <button
                  onClick={logOut}
                  className="w-full bg-red-950 border border-red-700 text-red-400 rounded-2xl p-3 font-bold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="text-xl font-black mb-4">Account</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-3 mb-3"
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-3 mb-3"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={logIn} className="bg-green-500 text-black rounded-2xl p-3 font-bold">
                    Login
                  </button>
                  <button onClick={signUp} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 font-bold">
                    Sign Up
                  </button>
                </div>
                <div className="text-xs text-zinc-500 mt-3 break-all">{authMessage}</div>
              </>
            )}
          </div>

          <div className="bg-[#050505] border border-green-500 rounded-[30px] p-6">
            <div className="text-zinc-400">TOTAL INCOME</div>
            <div className="text-3xl font-black text-green-400 mt-3 truncate">
              ${totalIncome.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6">
            <div className="text-zinc-400">TOTAL CLIPS</div>
            <div className="text-4xl font-black text-purple-400 mt-3">
              {totalClips}
            </div>
          </div>

          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6">
            <div className="text-zinc-400">DAILY AVERAGE</div>
            <div className="text-3xl font-black text-blue-400 mt-3 truncate">
              ${average.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#050505] border border-green-900 rounded-[30px] p-6">
            <div className="text-zinc-400">BEST DAY</div>
            <div className="text-3xl font-black text-green-400 mt-3 truncate">
              ${bestDay.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#050505] border border-zinc-900 rounded-[30px] p-6">
            <div className="text-zinc-400">DAYS TRACKED</div>
            <div className="text-4xl font-black mt-3">
              {daysTracked}
            </div>
          </div>
        </aside>

      </div>
    </main>
  )
}