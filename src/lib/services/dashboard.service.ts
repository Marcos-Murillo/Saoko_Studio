import { getDocs, query, collection, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { DashboardStats, MonthlyChartData, Expense, MonthlyFee, Payment } from '@/types'

import { getAllPayments, getPaymentsByPeriod } from './payment.service'
import { getExpenses } from './expense.service'
import { getMonthlyFeesByPeriod } from './fee.service'
import { monthStart, monthEnd, formatMonthShort, semesterRange, toMillis, monthsOverlapping } from '@/lib/utils/dates'

export async function getDashboardStats(year: number, month: number): Promise<DashboardStats> {
  return getDashboardStatsRange(monthStart(year, month), monthEnd(year, month))
}

export async function getDashboardStatsRange(start: Date, end: Date): Promise<DashboardStats> {
  const activeSnap = await getDocs(
    query(collection(db, COLLECTIONS.DANCERS), where('isActive', '==', true)),
  )
  const activeDancers = activeSnap.size

  const months = monthsOverlapping(start, end)
  const feeChunks = await Promise.all(months.map(({ year, month }) => getMonthlyFeesByPeriod(year, month)))
  const fees = feeChunks.flat()

  let accrualCollected = 0
  let totalPending = 0
  const debtorSet = new Set<string>()
  const upToDateSet = new Set<string>()

  fees.forEach((fee) => {
    accrualCollected += fee.amountPaid ?? 0
    if (fee.status === 'pending' || fee.status === 'partial') {
      totalPending += fee.amount - (fee.amountPaid ?? 0)
      debtorSet.add(fee.dancerId)
    } else if (fee.status === 'paid') {
      upToDateSet.add(fee.dancerId)
    }
  })

  debtorSet.forEach((id) => upToDateSet.delete(id))

  const payments = await getPaymentsByPeriod(start, end)
  const cashIncome = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const monthExpenses = await getExpenses(start, end)
  const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const creditsSnap = await getDocs(collection(db, COLLECTIONS.DANCER_CREDITS))
  let totalCreditBalance = 0
  let dancersWithCredit = 0
  creditsSnap.docs.forEach((d) => {
    const balance = (d.data().balance as number) ?? 0
    if (balance > 0) {
      totalCreditBalance += balance
      dancersWithCredit++
    }
  })

  return {
    activeDancers,
    dancersWithDebt: debtorSet.size,
    dancersUpToDate: upToDateSet.size,
    dancersWithCredit,
    cashIncomeThisMonth: cashIncome,
    accrualCollectedThisMonth: accrualCollected,
    totalCollectedThisMonth: cashIncome,
    totalPendingThisMonth: totalPending,
    totalExpensesThisMonth: totalExpenses,
    balanceThisMonth: cashIncome - totalExpenses,
    totalCreditBalance,
    feesGeneratedCount: fees.length,
  }
}

export async function getMonthlyChartData(months = 6): Promise<MonthlyChartData[]> {
  const result: MonthlyChartData[] = []
  const now = new Date()
  const [allPayments, allExpenses] = await Promise.all([
    getAllPayments(),
    getExpenses(),
  ])

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const start = monthStart(y, m).getTime()
    const end = monthEnd(y, m).getTime()

    const income = allPayments
      .filter((p) => {
        if (p.isVoided) return false
        const t = toMillis(p.paymentDate) || toMillis(p.createdAt)
        return t >= start && t <= end
      })
      .reduce((s, p) => s + (p.amount ?? 0), 0)

    const expenses = allExpenses
      .filter((e) => {
        const t = toMillis(e.expenseDate)
        return t >= start && t <= end
      })
      .reduce((s, e) => s + (e.amount ?? 0), 0)

    result.push({
      month: formatMonthShort(y, m),
      income,
      expenses,
      balance: income - expenses,
    })
  }

  return result
}

export async function getSemesterFinance(year: number, half: 1 | 2): Promise<{
  payments: Payment[]
  expenses: Expense[]
  fees: MonthlyFee[]
  cashIncome: number
  accrualCollected: number
  totalExpenses: number
  chart: MonthlyChartData[]
}> {
  const { start, end, months } = semesterRange(year, half)
  const [payments, expenses, ...feeChunks] = await Promise.all([
    getPaymentsByPeriod(start, end),
    getExpenses(start, end),
    ...months.map(m => getMonthlyFeesByPeriod(year, m)),
  ])
  const fees = feeChunks.flat()
  const cashIncome = payments.reduce((s, p) => s + p.amount, 0)
  const accrualCollected = fees.reduce((s, f) => s + f.amountPaid, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const chart: MonthlyChartData[] = []
  for (const m of months) {
    const monthPayments = payments.filter(p => {
      const t = toMillis(p.paymentDate)
      const d = new Date(t)
      return d.getFullYear() === year && d.getMonth() + 1 === m
    })
    const monthExpenses = expenses.filter(e => {
      const t = toMillis(e.expenseDate)
      const d = new Date(t)
      return d.getFullYear() === year && d.getMonth() + 1 === m
    })
    const income = monthPayments.reduce((s, p) => s + p.amount, 0)
    const exp = monthExpenses.reduce((s, e) => s + e.amount, 0)
    chart.push({
      month: formatMonthShort(year, m),
      income,
      expenses: exp,
      balance: income - exp,
    })
  }
  return { payments, expenses, fees, cashIncome, accrualCollected, totalExpenses, chart }
}
