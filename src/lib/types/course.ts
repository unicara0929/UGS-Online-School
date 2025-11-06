export interface Course {
  id: string
  title: string
  description: string
  category: 'income' | 'lifestyle' | 'startup'
  level: 'basic' | 'advanced'
  lessons: Lesson[]
  isLocked: boolean
  progress: number
}

export interface Lesson {
  id: string
  title: string
  description: string
  videoUrl?: string
  vimeoId?: string // Vimeo動画ID
  pdfUrl?: string
  duration: number
  isCompleted: boolean
  order: number
}
