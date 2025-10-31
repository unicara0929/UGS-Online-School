import { User } from '@/lib/types'

export const MockUserData: User[] = [
  {
    id: '1',
    email: 'member@example.com',
    name: '田中 太郎',
    role: 'member',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    email: 'fp@example.com',
    name: '佐藤 花子',
    role: 'fp',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    email: 'manager@example.com',
    name: '鈴木 一郎',
    role: 'manager',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '4',
    email: 'admin@example.com',
    name: '山田 二郎',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]
