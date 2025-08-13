import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../')
const fvttRoot = join(repoRoot, 'fvtt-cyberpunk-red-core-master', 'src')
const packsRoot = join(fvttRoot, 'packs')
const outputRoot = join(repoRoot, 'gm-tool', 'public', 'data')

async function ensureDir(p) { await mkdir(p, { recursive: true }) }

async function collectYaml(dir) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...await collectYaml(p))
    } else if (e.isFile() && e.name.endsWith('.yaml')) {
      out.push(p)
    }
  }
  return out
}

async function run() {
  const categories = ['core', 'black-chrome', 'dlc', 'internal', 'other']
  await ensureDir(outputRoot)

  for (const cat of categories) {
    const catDir = join(packsRoot, cat)
    try {
      const files = await collectYaml(catDir)
      const data = []
      for (const f of files) {
        const src = await readFile(f, 'utf8')
        try {
          const doc = YAML.parse(src)
          data.push({ file: f.replace(packsRoot + '\\', '').replace(packsRoot + '/', ''), ...doc })
        } catch (e) {
          console.warn('YAML parse error in', f, e.message)
        }
      }
      const outFile = join(outputRoot, `${cat}.json`)
      await ensureDir(dirname(outFile))
      await writeFile(outFile, JSON.stringify(data, null, 2), 'utf8')
      console.log('Wrote', outFile, data.length, 'entries')
    } catch (e) {
      // category may not exist
      console.warn('Skip category', cat, e.message)
    }
  }

  // also export lang/en.json for labels
  try {
    const lang = await readFile(join(fvttRoot, 'lang', 'en.json'), 'utf8')
    await ensureDir(outputRoot)
    await writeFile(join(outputRoot, 'lang-en.json'), lang, 'utf8')
  } catch {}
}

run()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
