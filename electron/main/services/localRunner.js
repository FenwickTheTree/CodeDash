import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function getFilesInDir(dir) {
  if (!dir) return []
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    return entries
      .filter(e => e.isFile() && /\.(cpp|java|py)$/.test(e.name))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
        ext: path.extname(e.name).slice(1)
      }))
  } catch {
    return []
  }
}

export async function runTests({ filePath, language, compilerPath, tests }) {
  const results = []
  const tmpDir = os.tmpdir()
  const baseName = path.basename(filePath, path.extname(filePath))

  let compileError = null
  let binaryPath = null

  if (language === 'cpp') {
    binaryPath = path.join(tmpDir, `codedash_${Date.now()}`)
    const compiler = compilerPath || 'g++'
    try {
      await execAsync(`"${compiler}" -o "${binaryPath}" -O2 -std=c++17 "${filePath}"`, { timeout: 30000 })
    } catch (err) {
      compileError = (err.stderr || err.message || 'Compilation failed').trim()
    }
  } else if (language === 'java') {
    const compiler = compilerPath || 'javac'
    try {
      await execAsync(`"${compiler}" -d "${tmpDir}" "${filePath}"`, { timeout: 30000 })
    } catch (err) {
      compileError = (err.stderr || err.message || 'Compilation failed').trim()
    }
  }

  if (compileError) {
    return tests.map(t => ({
      input: t.input, expected: t.output, actual: '', verdict: 'CE', error: compileError, time: 0
    }))
  }

  for (const test of tests) {
    const inputFile = path.join(tmpDir, `cf_in_${Date.now()}.txt`)
    await fs.promises.writeFile(inputFile, test.input)

    let runCmd
    if (language === 'cpp') {
      runCmd = `"${binaryPath}" < "${inputFile}"`
    } else if (language === 'java') {
      const javaExec = compilerPath
        ? path.join(path.dirname(compilerPath), 'java')
        : 'java'
      runCmd = `"${javaExec}" -cp "${tmpDir}" "${baseName}" < "${inputFile}"`
    } else {
      const interpreter = compilerPath || 'python3'
      runCmd = `"${interpreter}" "${filePath}" < "${inputFile}"`
    }

    const start = Date.now()
    try {
      const { stdout, stderr } = await execAsync(runCmd, { timeout: 5000 })
      const elapsed = Date.now() - start
      const actual = stdout.trim()
      const expected = test.output.trim()
      results.push({
        input: test.input, expected, actual,
        verdict: actual === expected ? 'AC' : 'WA',
        error: stderr.trim() || null, time: elapsed
      })
    } catch (err) {
      const elapsed = Date.now() - start
      results.push({
        input: test.input, expected: test.output, actual: (err.stdout || '').trim(),
        verdict: err.killed ? 'TLE' : 'RE',
        error: (err.stderr || err.message || '').trim(), time: elapsed
      })
    }

    fs.promises.unlink(inputFile).catch(() => {})
  }

  if (binaryPath) fs.promises.unlink(binaryPath).catch(() => {})

  return results
}
