#!/usr/bin/env ts-node
/**
 * Fix remaining return type warnings including arrow functions and multiline declarations
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface ESLintMessage {
  ruleId: string
  line: number
  column: number
}

interface ESLintResult {
  filePath: string
  messages: ESLintMessage[]
}

function fixFile(filePath: string, warnings: ESLintMessage[]): number {
  let content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const isTSX = filePath.endsWith('.tsx')

  // Sort warnings by line number (descending) to maintain line numbers
  const sortedWarnings = warnings.sort((a, b) => b.line - a.line)

  let fixed = 0

  for (const warning of sortedWarnings) {
    const lineIndex = warning.line - 1
    const line = lines[lineIndex]

    // Skip if already has return type
    if (line.match(/\):\s*\w+/) || line.match(/=>\s*\w+/)) {
      continue
    }

    let newLine = line

    // Pattern 1: Arrow function in const/let/export const
    // const fn = () => { or const fn = async () => {
    if (line.match(/(?:const|let|export const)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/)) {
      if (line.includes('async')) {
        if (isTSX) {
          newLine = line.replace(/\)\s*=>/, '): Promise<JSX.Element> =>')
        } else {
          newLine = line.replace(/\)\s*=>/, '): Promise<void> =>')
        }
      } else {
        if (isTSX) {
          newLine = line.replace(/\)\s*=>/, '): JSX.Element =>')
        } else {
          newLine = line.replace(/\)\s*=>/, '): void =>')
        }
      }
      fixed++
    }
    // Pattern 2: Multiline function declaration ending with {
    // function fn(...) {
    else if (line.includes('}') && lineIndex > 0) {
      // This is the closing brace of params, check previous lines
      let funcLine = lineIndex
      while (funcLine >= 0 && !lines[funcLine].includes('function')) {
        funcLine--
      }

      if (funcLine >= 0 && lines[funcLine].includes('function')) {
        // Check if return type already exists between function and {
        let hasReturnType = false
        for (let i = funcLine; i <= lineIndex; i++) {
          if (lines[i].match(/\):\s*\w+/)) {
            hasReturnType = true
            break
          }
        }

        if (!hasReturnType) {
          // Add return type before the {
          const returnType = isTSX ? 'JSX.Element' : 'void'
          newLine = line.replace(/\)\s*\{/, `): ${returnType} {`)
          fixed++
        }
      }
    }
    // Pattern 3: GET/POST/etc handlers without proper type
    else if (line.match(/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|DELETE|PATCH)/)) {
      if (!line.includes('NextResponse')) {
        newLine = line.replace(/\)/, '): Promise<NextResponse>')
        // Import NextResponse if not already imported
        if (!content.includes('import') || !content.includes('NextResponse')) {
          lines[0] = "import { NextResponse } from 'next/server'\n" + lines[0]
        }
        fixed++
      }
    }

    if (newLine !== line) {
      lines[lineIndex] = newLine
    }
  }

  if (fixed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }

  return fixed
}

async function main(): Promise<void> {
  console.log('🔍 Analyzing remaining return type warnings...\n')

  let eslintOutput: string
  try {
    eslintOutput = execSync(
      'npx eslint --format json "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}" --no-error-on-unmatched-pattern',
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    )
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      eslintOutput = (error as { stdout: string }).stdout
    } else {
      throw error
    }
  }

  const results: ESLintResult[] = JSON.parse(eslintOutput)

  const filesToFix = results
    .filter((result) =>
      result.messages.some((m) => m.ruleId === '@typescript-eslint/explicit-function-return-type')
    )
    .map((result) => ({
      filePath: result.filePath,
      warnings: result.messages.filter(
        (m) => m.ruleId === '@typescript-eslint/explicit-function-return-type'
      ),
    }))

  console.log(`📝 Found ${filesToFix.length} files still needing fixes\n`)

  let totalFixed = 0
  let filesFixed = 0

  for (const { filePath, warnings } of filesToFix) {
    const relativePath = path.relative(process.cwd(), filePath)
    const fixed = fixFile(filePath, warnings)

    if (fixed > 0) {
      console.log(`✓ ${relativePath}: Fixed ${fixed} warnings`)
      totalFixed += fixed
      filesFixed++
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Warnings fixed: ${totalFixed}`)
  console.log(`\n📊 Run 'npm run lint' to verify.`)
}

main().catch(console.error)
