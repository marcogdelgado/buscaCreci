import { AxiosRequestConfig } from 'axios'
export default interface IQueue {
    requestConfig: AxiosRequestConfig
    OutputDirectory: string
    OutputDirectoryError: string
    WorkerDataDirectory: string
}
