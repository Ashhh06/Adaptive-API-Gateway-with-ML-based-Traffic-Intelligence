import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')
const target = path.join(__dirname, '..', '..', 'gateway', 'public', 'dashboard')

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Run `npm run build` first (dist/ missing).')
  process.exit(1)
}

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(dist, target, { recursive: true })
console.log('Copied dist -> gateway/public/dashboard')
