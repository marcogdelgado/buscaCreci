import { Worker } from 'worker_threads'
import IQueue from '../interfaces/IQueue'

export class Queue {
  private queue = []
  private configQueue = {
    limitProcess: 4,
    numberProcessExec: 0
  }

  public async inQueue (item : IQueue) {
    if (this.configQueue.limitProcess < this.queue.length) {
      // console.log('FILA CHEIA, ESPERANDO ALGUM PROCESSO TERMINAR')
      await this.queue[0]
      return this.inQueue(item)
    }
    const w = this.createWorker(item)
    this.queue.push(w)
    // console.log('RODANDO ' + item.requestConfig.data.registerNumber)
    await w
    // console.log('TERMINOU ' + item.requestConfig.data.registerNumber)
    this.queue = this.queue.filter(item => item !== w)
  }

  private createWorker (item : IQueue) {
    return new Promise<void>((resolve, reject) => {
      const w = new Worker(item.WorkerDataDirectory, {
        workerData: {
          requestConfig: item.requestConfig,
          OutputDirectory: item.OutputDirectory,
          OutputDirectoryError: item.OutputDirectoryError
        }
      })

      w.on('online', (e) => {
        this.configQueue.numberProcessExec++
      })

      w.on('exit', (e) => {
        this.configQueue.numberProcessExec--
        resolve()
      })

      w.on('message', (e) => {
        console.log(e)
        if (!e.status) {
          reject(new Error(''))
        }
      })
    })
  }
}
