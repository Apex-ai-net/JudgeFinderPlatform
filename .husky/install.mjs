import { execSync } from 'child_process'

// Skip husky installation in production/CI environments
// This prevents build failures when devDependencies are not installed
if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI === 'true' ||
  process.env.NETLIFY === 'true' ||
  process.env.VERCEL
) {
  console.log('Skipping husky installation in production/CI environment')
  process.exit(0)
}

// Install husky git hooks in development
console.log('Installing husky git hooks...')
try {
  execSync('npx husky', { stdio: 'inherit' })
  console.log('Husky git hooks installed successfully')
} catch (error) {
  console.error('Failed to install husky:', error.message)
  process.exit(1)
}
