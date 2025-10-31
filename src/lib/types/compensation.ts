export interface Compensation {
  id: string
  month: string
  amount: number
  breakdown: {
    memberReferral: number
    fpReferral: number
    contract: number
    bonus: number
    deduction: number
  }
  status: 'pending' | 'confirmed' | 'paid'
}
