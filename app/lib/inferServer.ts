import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import readline from 'readline'
import path from 'path'

export type Emotion = {
  label: string
  confidence: number
  emotions: Array<{ label: string; score: number }>
}

type PendingRequest = {
  resolve: (value: Emotion) => void
  reject: (reason: unknown) => void
}

type InferServer = {
  child: ChildProcessWithoutNullStreams
  ready: Promise<void>
  queue: PendingRequest[]
}

declare global {
  var __inferServer: InferServer | undefined
}

function startInferServer(): InferServer {
  const beDir = path.join(process.cwd(), 'BE')
  const child = spawn('python', ['infer_server.py'], { cwd: beDir })

  const queue: PendingRequest[] = []
  let markReady: () => void
  const ready = new Promise<void>((resolve) => {
    markReady = resolve
  })

  let sawReadyLine = false
  const rl = readline.createInterface({ input: child.stdout })
  rl.on('line', (line) => {
    if (!sawReadyLine) {
      sawReadyLine = true
      markReady()
      return
    }
    const pending = queue.shift()
    if (!pending) return
    try {
      const parsed = JSON.parse(line)
      if (parsed.error) {
        pending.reject(new Error(parsed.error))
      } else {
        pending.resolve(parsed as Emotion)
      }
    } catch (err) {
      pending.reject(err)
    }
  })

  child.stderr.on('data', (chunk) => {
    console.error('[infer_server]', chunk.toString())
  })

  child.on('exit', (code) => {
    console.error(`[infer_server] exited with code ${code}`)
    if (globalThis.__inferServer?.child === child) {
      globalThis.__inferServer = undefined
    }
    while (queue.length) {
      queue.shift()?.reject(new Error('감정 분석 서버가 종료되었습니다.'))
    }
  })

  return { child, ready, queue }
}

function getInferServer(): InferServer {
  if (!globalThis.__inferServer) {
    globalThis.__inferServer = startInferServer()
  }
  return globalThis.__inferServer
}

export function warmUpInferServer() {
  getInferServer()
}

export async function runInference(text: string): Promise<Emotion> {
  const server = getInferServer()
  await server.ready
  return new Promise<Emotion>((resolve, reject) => {
    server.queue.push({ resolve, reject })
    server.child.stdin.write(JSON.stringify({ text }) + '\n')
  })
}
