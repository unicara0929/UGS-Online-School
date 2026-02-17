import type { RegistrationFormField, RegistrationFieldType } from '@/types/event'

const VALID_FIELD_TYPES: RegistrationFieldType[] = [
  'TEXT', 'TEXTAREA', 'SELECT', 'MULTI_SELECT', 'RADIO', 'DATE', 'RATING',
]

/**
 * externalFormFields のバリデーション
 * Prisma Json 型から型安全に RegistrationFormField[] を取得
 */
export function parseExternalFormFields(
  raw: unknown
): { fields: RegistrationFormField[]; error?: string } {
  if (raw === null || raw === undefined) {
    return { fields: [] }
  }

  if (!Array.isArray(raw)) {
    return { fields: [], error: 'externalFormFields は配列である必要があります' }
  }

  const fields: RegistrationFormField[] = []

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (typeof item !== 'object' || item === null) {
      return { fields: [], error: `externalFormFields[${i}] はオブジェクトである必要があります` }
    }

    const { id, label, type, required, description, options, placeholder } = item as Record<string, unknown>

    if (typeof id !== 'string' || id.length === 0) {
      return { fields: [], error: `externalFormFields[${i}].id は必須の文字列です` }
    }
    if (typeof label !== 'string') {
      return { fields: [], error: `externalFormFields[${i}].label は必須の文字列です` }
    }
    if (!VALID_FIELD_TYPES.includes(type as RegistrationFieldType)) {
      return { fields: [], error: `externalFormFields[${i}].type が不正です: ${String(type)}` }
    }
    if (typeof required !== 'boolean') {
      return { fields: [], error: `externalFormFields[${i}].required は真偽値である必要があります` }
    }

    // options の検証（SELECT/MULTI_SELECT/RADIO は選択肢が必要）
    const needsOptions = ['SELECT', 'MULTI_SELECT', 'RADIO'].includes(type as string)
    if (needsOptions && (!Array.isArray(options) || options.length === 0)) {
      return { fields: [], error: `externalFormFields[${i}] (${type}) には選択肢が必要です` }
    }
    if (options !== undefined && !Array.isArray(options)) {
      return { fields: [], error: `externalFormFields[${i}].options は配列である必要があります` }
    }
    if (Array.isArray(options) && !options.every((o): o is string => typeof o === 'string')) {
      return { fields: [], error: `externalFormFields[${i}].options の要素は文字列である必要があります` }
    }

    const field: RegistrationFormField = {
      id,
      label,
      type: type as RegistrationFieldType,
      required,
    }
    if (typeof description === 'string' && description.length > 0) {
      field.description = description
    }
    if (typeof placeholder === 'string' && placeholder.length > 0) {
      field.placeholder = placeholder
    }
    if (Array.isArray(options)) {
      field.options = options as string[]
    }
    fields.push(field)
  }

  return { fields }
}

/**
 * customFieldAnswers のバリデーション
 * フィールド定義に基づいて回答の型を検証
 */
export function validateCustomFieldAnswers(
  answers: unknown,
  fields: RegistrationFormField[]
): { valid: boolean; error?: string; sanitized: Record<string, string | string[] | number> } {
  if (answers === null || answers === undefined) {
    // 必須フィールドがなければOK
    const requiredField = fields.find(f => f.required)
    if (requiredField) {
      return { valid: false, error: `${requiredField.label}は必須です`, sanitized: {} }
    }
    return { valid: true, sanitized: {} }
  }

  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return { valid: false, error: 'customFieldAnswers はオブジェクトである必要があります', sanitized: {} }
  }

  const rawAnswers = answers as Record<string, unknown>
  const sanitized: Record<string, string | string[] | number> = {}

  for (const field of fields) {
    const value = rawAnswers[field.id]

    // 必須チェック
    if (field.required) {
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        return { valid: false, error: `${field.label}は必須です`, sanitized: {} }
      }
    }

    // 値がない場合はスキップ
    if (value === undefined || value === null || value === '') {
      continue
    }

    // フィールドタイプ別の型検証
    switch (field.type) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'DATE':
        if (typeof value !== 'string') {
          return { valid: false, error: `${field.label}は文字列である必要があります`, sanitized: {} }
        }
        sanitized[field.id] = String(value).slice(0, 5000) // 長さ制限
        break

      case 'SELECT':
      case 'RADIO':
        if (typeof value !== 'string') {
          return { valid: false, error: `${field.label}は文字列である必要があります`, sanitized: {} }
        }
        // 選択肢に含まれているか検証
        if (field.options && !field.options.includes(value)) {
          return { valid: false, error: `${field.label}の値が選択肢にありません`, sanitized: {} }
        }
        sanitized[field.id] = value
        break

      case 'MULTI_SELECT':
        if (!Array.isArray(value)) {
          return { valid: false, error: `${field.label}は配列である必要があります`, sanitized: {} }
        }
        if (!value.every((v): v is string => typeof v === 'string')) {
          return { valid: false, error: `${field.label}の要素は文字列である必要があります`, sanitized: {} }
        }
        // 選択肢に含まれているか検証
        if (field.options) {
          const invalidOption = value.find(v => !field.options!.includes(v))
          if (invalidOption) {
            return { valid: false, error: `${field.label}に不正な選択肢があります: ${invalidOption}`, sanitized: {} }
          }
        }
        sanitized[field.id] = value
        break

      case 'RATING':
        if (typeof value !== 'number' || value < 1 || value > 5 || !Number.isInteger(value)) {
          return { valid: false, error: `${field.label}は1〜5の整数である必要があります`, sanitized: {} }
        }
        sanitized[field.id] = value
        break

      default:
        // 未知のフィールドタイプの値は無視
        break
    }
  }

  return { valid: true, sanitized }
}
