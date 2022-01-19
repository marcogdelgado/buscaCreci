import axios, { AxiosRequestConfig } from 'axios'
import { workerData, parentPort } from 'worker_threads'
import { load } from 'cheerio'
import { appendFileSync } from 'fs'
(async () => {
  try {
    // console.log(workerData.requestConfig.data.registerNumber)
    const obj = {
      nome: '',
      'e-mail oficial': '',
      'e-mail pessoal': '',
      creci: workerData.requestConfig.data.registerNumber
    }
    const response = await axios(workerData.requestConfig as AxiosRequestConfig)
    const $ = load(response.data)
    obj.nome = $('body > div > div > section > div.row > div.col-sm-9 > h3').text().trim()
    const content = $('body > div > div > section > div.row > div.col-sm-9 > div').text()
    const emails = content.split('\n').filter(item => item.toLowerCase().includes('e-mail'))
    emails.forEach(item => {
      const itemSplit = item.split(':')
      const indice = itemSplit[0].toLowerCase().trim()
      obj[indice] = itemSplit[1].trim()
    })
    // let emailPessoal = $('body > div > div > section > div.row > div.col-sm-9 > div > div:nth-child(5)').text()
    // console.log(emailPessoal, emailOficial)
    // if (emailOficial) { emailOficial = emailOficial.split(':')[1].trim() }
    if (obj['e-mail oficial'] || obj['e-mail pessoal']) {
      appendFileSync(workerData.OutputDirectory, Object.values(obj).join(';') + '\n')
    }
  } catch (error) {
    console.log(error)
    appendFileSync(workerData.OutputDirectoryError, `${workerData.requestConfig.data.registerNumber}\n`)
    parentPort.postMessage({ status: false, value: workerData.requestConfig.data.registerNumber })
  } finally {
    process.exit(1)
  }
})()
