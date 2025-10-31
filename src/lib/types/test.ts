export interface Test {
  id: string
  title: string
  questions: Question[]
  passingScore: number
  isCompleted: boolean
  score?: number
}

export interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}
