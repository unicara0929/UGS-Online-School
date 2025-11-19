/**
 * API権限チェックの実装ばらつきを確認するスクリプト
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface HardcodedCheck {
  file: string
  line: number
  code: string
  type: 'hardcoded' | 'uses-helper'
}

async function main() {
  console.log('📊 API権限チェックの実装ばらつきを確認中...\n')

  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')

  // ハードコードされたロールチェックを検索
  console.log('🔍 ハードコードされたロールチェックを検索...\n')

  try {
    const result = execSync(
      `grep -rn "role\\s*\\(===\\|!==\\|==\\|!=\\)\\s*['\\"](admin\\|member\\|fp\\|manager\\|ADMIN\\|MEMBER\\|FP\\|MANAGER)" "${apiDir}" --include="*.ts" || true`,
      { encoding: 'utf-8' }
    )

    const hardcodedChecks: HardcodedCheck[] = []

    if (result) {
      const lines = result.trim().split('\n')
      lines.forEach(line => {
        const match = line.match(/^([^:]+):(\d+):(.+)$/)
        if (match) {
          const [, file, lineNum, code] = match
          hardcodedChecks.push({
            file: file.replace(apiDir + '/', ''),
            line: parseInt(lineNum),
            code: code.trim(),
            type: 'hardcoded'
          })
        }
      })
    }

    console.log(`❌ ハードコードされたチェック: ${hardcodedChecks.length}件\n`)

    if (hardcodedChecks.length > 0) {
      hardcodedChecks.forEach(check => {
        console.log(`  ${check.file}:${check.line}`)
        console.log(`    ${check.code}`)
        console.log()
      })
    }

    // checkRole/checkAdminを使用しているファイルを検索
    console.log('✅ checkRole/checkAdminヘルパーを使用しているファイルを検索...\n')

    const helperResult = execSync(
      `grep -rn "checkRole\\|checkAdmin" "${apiDir}" --include="*.ts" || true`,
      { encoding: 'utf-8' }
    )

    const helperChecks: HardcodedCheck[] = []

    if (helperResult) {
      const lines = helperResult.trim().split('\n')
      lines.forEach(line => {
        const match = line.match(/^([^:]+):(\d+):(.+)$/)
        if (match) {
          const [, file, lineNum, code] = match
          // インポート文を除外
          if (!code.includes('import')) {
            helperChecks.push({
              file: file.replace(apiDir + '/', ''),
              line: parseInt(lineNum),
              code: code.trim(),
              type: 'uses-helper'
            })
          }
        }
      })
    }

    console.log(`✅ ヘルパー使用: ${helperChecks.length}件\n`)

    if (helperChecks.length > 0) {
      const uniqueFiles = [...new Set(helperChecks.map(c => c.file))]
      uniqueFiles.forEach(file => {
        console.log(`  ${file}`)
      })
      console.log()
    }

    // サマリー
    console.log('📊 サマリー:')
    console.log(`  - ハードコード: ${hardcodedChecks.length}件`)
    console.log(`  - ヘルパー使用: ${helperChecks.length}件`)
    console.log()

    if (hardcodedChecks.length > 0) {
      console.log('⚠️  推奨事項:')
      console.log('  1. getAuthenticatedUser() を使用して認証ユーザーを取得')
      console.log('  2. checkRole(userRole, RoleGroups.ADMIN_ONLY) などを使用')
      console.log('  3. checkAdmin(userRole) を使用（管理者のみの場合）')
      console.log()
    } else {
      console.log('✅ すべてのAPIでヘルパー関数が使用されています')
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

main()
