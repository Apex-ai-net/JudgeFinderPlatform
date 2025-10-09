#!/usr/bin/env ts-node
/**
 * Intelligently adds explicit return types to functions missing them
 * Handles React components, API routes, and utility functions
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface ESLintMessage {
  ruleId: string
  line: number
  column: number
  message: string
}

interface ESLintResult {
  filePath: string
  messages: ESLintMessage[]
}

interface ReturnTypeRule {
  pattern: RegExp
  returnType: string
}

// Rules for determining return types based on function patterns
const RETURN_TYPE_RULES: ReturnTypeRule[] = [
  // NextJS API route handlers
  {
    pattern: /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/,
    returnType: 'Promise<NextResponse>',
  },

  // React Server Components (async)
  { pattern: /export\s+default\s+async\s+function\s+\w+Page/, returnType: 'Promise<JSX.Element>' },
  {
    pattern: /export\s+default\s+async\s+function\s+\w+Layout/,
    returnType: 'Promise<JSX.Element>',
  },

  // React Components (sync) - in .tsx files
  {
    pattern: /export\s+default\s+function\s+\w+(Page|Layout|Component)/,
    returnType: 'JSX.Element',
  },
  { pattern: /export\s+function\s+\w+/, returnType: 'JSX.Element' }, // Generic exported function in TSX
  { pattern: /function\s+\w+\s*\([^)]*\)\s*\{/, returnType: 'JSX.Element' }, // Default for TSX files
]

function detectReturnType(line: string, filePath: string, functionBody?: string): string {
  const isTSX = filePath.endsWith('.tsx')
  const isTSFile = filePath.endsWith('.ts')

  // Check specific patterns
  for (const rule of RETURN_TYPE_RULES) {
    if (rule.pattern.test(line)) {
      // Only apply JSX.Element to TSX files
      if (rule.returnType.includes('JSX') && !isTSX) {
        continue
      }
      return rule.returnType
    }
  }

  // Async functions
  if (line.includes('async')) {
    if (line.match(/NextResponse/)) {
      return 'Promise<NextResponse>'
    }
    if (isTSX) {
      return 'Promise<JSX.Element>'
    }
    return 'Promise<void>'
  }

  // TSX files default to JSX.Element for non-async functions
  if (isTSX && line.match(/function\s+\w+/)) {
    return 'JSX.Element'
  }

  // Safe default
  return 'void'
}

function addReturnType(line: string, returnType: string): string {
  // Handle different function declaration styles

  // async function name() {
  if (line.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  // function name() {
  if (line.match(/function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  // export async function name() {
  if (line.match(/export\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  // export function name() {
  if (line.match(/export\s+function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  // export default function name() {
  if (line.match(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  // export default async function name() {
  if (line.match(/export\s+default\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{/)) {
    return line.replace(/\)(\s*)\{/, `): ${returnType}$1{`)
  }

  return line
}

async function main(): Promise<void> {
  console.log('🔍 Analyzing codebase for missing return types...\n')

  // Run ESLint to get all warnings
  let eslintOutput: string
  try {
    eslintOutput = execSync(
      'npx eslint --format json "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}" --no-error-on-unmatched-pattern',
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    )
  } catch (error: unknown) {
    // ESLint exits with code 1 if there are warnings, but still outputs JSON
    if (error && typeof error === 'object' && 'stdout' in error) {
      eslintOutput = (error as { stdout: string }).stdout
    } else {
      throw error
    }
  }

  const results: ESLintResult[] = JSON.parse(eslintOutput)

  // Filter files with explicit-function-return-type warnings
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

  console.log(`📝 Found ${filesToFix.length} files with missing return types\n`)

  let totalFixed = 0
  let filesFixed = 0
  const skippedFiles: string[] = []

  for (const { filePath, warnings } of filesToFix) {
    const relativePath = path.relative(process.cwd(), filePath)
    console.log(`\n📄 ${relativePath} (${warnings.length} warnings)`)

    let content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // Process warnings in reverse order to preserve line numbers
    const sortedWarnings = warnings.sort((a, b) => b.line - a.line)

    let fixedInFile = 0

    for (const warning of sortedWarnings) {
      const lineIndex = warning.line - 1
      const originalLine = lines[lineIndex]

      // Skip if already has return type
      if (originalLine.match(/\):\s*\w+/)) {
        continue
      }

      // Detect appropriate return type
      const returnType = detectReturnType(originalLine, filePath)
      const newLine = addReturnType(originalLine, returnType)

      if (newLine !== originalLine) {
        lines[lineIndex] = newLine
        fixedInFile++
        console.log(`  ✓ Line ${warning.line}: Added ${returnType}`)
      } else {
        console.log(`  ⚠ Line ${warning.line}: Could not auto-fix (manual review needed)`)
      }
    }

    if (fixedInFile > 0) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
      totalFixed += fixedInFile
      filesFixed++
    } else if (warnings.length > 0) {
      skippedFiles.push(relativePath)
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Functions fixed: ${totalFixed}`)

  if (skippedFiles.length > 0) {
    console.log(`\n⚠️  Files needing manual review: ${skippedFiles.length}`)
    skippedFiles.forEach((f) => console.log(`   - ${f}`))
  }

  console.log(`\n📊 Run 'npm run lint' to verify fixes.`)
}

main().catch(console.error)
