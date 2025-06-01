import { ref, Ref } from 'vue'

/**
 * 运行结果的返回结构
 */
export interface RunResult {
  run: () => Promise<void>
  result: Ref<any>
  error: Ref<string | null>
  duration: Ref<number | null>
  logs: Ref<string[]>
}

/**
 * 使用 Web Worker 运行js代码
 * @param code js代码内容
 * @returns 运行函数及结果、错误、耗时、控制台输出
 */
export function useRunJSCode(code: string): RunResult {
  const result = ref<any>(null)
  const error = ref<string | null>(null)
  const duration = ref<number | null>(null)
  const logs = ref<string[]>([])
  let worker: Worker | null = null

  const run = async () => {
    result.value = null
    error.value = null
    duration.value = null
    logs.value = []
      // 结束旧 worker
    if (worker) worker.terminate()
      // 创建新的 Web Worker
      const jsCode = `
        self.onmessage = async (e) => {
          const start = performance.now()
          try {
            const logs = [] 
            const originalLog = console.log
            console.log = (...args) => {
              logs.push(args.map(String).join(' '))
            }
            const result = await eval(e.data)
            console.log = originalLog
            const duration = performance.now() - start
            self.postMessage({ result, logs, duration })
          } catch (err) {
            const duration = performance.now() - start
            self.postMessage({ error: err.message, duration })
          }
        }
      `
      worker = new Worker(
        URL.createObjectURL(new Blob([jsCode], { type: 'application/javascript' }))
      )

      const response = await new Promise<{ result?: any; error?: string; logs?: string[]; duration: number }>((resolve) => {
      worker!.onmessage = (e) => resolve(e.data)
      worker!.postMessage(code)
      })
      duration.value = response.duration
      logs.value = response.logs || []
      if (response.error) {
        error.value = response.error
      } else {
        result.value = response.result
      }
  }

  return { run, result, error, duration, logs}
}
