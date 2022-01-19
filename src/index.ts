import CreateBrowser from './CreateBrowser/CreateBrowser'
import { config } from 'dotenv'
import { parse, join } from 'path'
import resolveCaptcha from './components/captcha/normal/resolveCaptcha'
import { mkdirSync, writeFileSync } from 'fs'
import { CaptchaBalanceError } from './errors/CaptchaBalanceError'
import CONFIG from './config.json'
import { Queue } from './components/Queue'
const cookiesAllowed = ['_ga', '_gid', 'ASP.NET_SessionId']
const queue = new Queue()
async function main () {
  try {
    config({ path: join(parse(__dirname).dir, '.env') })
    mkdirSync(join(process.cwd(), 'saida'), { recursive: true })
    const newBrowser = new CreateBrowser()
    const { browser, page } = await newBrowser.init()
    await page.goto('https://www.crecisp.gov.br/cidadao/buscaporcorretores', { waitUntil: 'networkidle0' })

    await page.type('#RegisterNumber', '') // CRECI
    await page.type('#Name', '') // NOME
    await page.select('#City', 'CAPAO BONITO') // MUNICIPIO   SAO PAULO
    await page.select('#Language', '- Selecione -')
    await resolveCaptcha(page)

    await page.waitForSelector('body > div > div > section > div.pagination.row.justify-content-center.mt-3 > ol')
    const cookies = await newBrowser.getCookies(cookiesAllowed)
    CONFIG.cookie = cookies
    const pagsArray = await page.$$eval('body > div > div > section > div.pagination.row.justify-content-center.mt-3 > ol > li', element => element.length)
    await page.click(`body > div > div > section > div.pagination.row.justify-content-center.mt-3 > ol > li:nth-child(${pagsArray - 1}) > a`)
    await page.waitForTimeout(5000)
    const pagsArrayAux = await page.$$eval('body > div > div > section > div.pagination.row.justify-content-center.mt-3 > ol > li', element => element.length)
    let ultimaPag = ''
    if (CONFIG.lastPage) {
      ultimaPag = CONFIG.lastPage
    } else {
      ultimaPag = await page.$eval(`body > div > div > section > div.pagination.row.justify-content-center.mt-3 > ol > li:nth-child(${pagsArrayAux - 1}) > a`, element => element.textContent.trim())
    }
    for (let index = 0; index <= parseInt(ultimaPag); index++) {
      CONFIG.lastPage = index.toString()
      await page.goto(`https://www.crecisp.gov.br/cidadao/listadecorretores?page=${index}`, { waitUntil: 'networkidle0' })
      await page.waitForSelector('body > div > div > section > div:nth-child(4)')
      const corretoresArray = await page.$$eval('body > div > div > section > div:nth-child(4) > div', element => element.length)
      for (let i = 1; i <= corretoresArray; i++) {
        const creci = await page.$eval(`body > div > div > section > div:nth-child(4) > div:nth-child(${i}) > div:nth-child(2) > span`, element => element.textContent.trim())
        // CONFIG.lastCreci.push(creci)
        setItemInQueue(creci)
      }
      // CONFIG.lastCreci = []
    }

    await page.waitForTimeout(10000)
    await newBrowser.closeAll(browser)
    return { status: true }
  } catch (error) {
    if (error instanceof CaptchaBalanceError) {
      return { status: true, error: 'Sem creditos para burlar o captcha' }
    }
    writeFileSync(join(__dirname, 'config.json'), JSON.stringify(CONFIG))
    console.log(error)
    return { status: false }
  }
}

function setItemInQueue (creci: string) {
  queue.inQueue({
    requestConfig: {
      url: 'https://www.crecisp.gov.br/cidadao/corretordetalhes',
      method: 'post',
      headers: {
        cookie: CONFIG.cookie
      },
      data: {
        registerNumber: creci
      }
    },
    OutputDirectory: join(process.cwd(), 'saida', 'contatos.csv'),
    OutputDirectoryError: join(process.cwd(), 'saida', 'error.csv'),
    WorkerDataDirectory: join(__dirname, 'details.js')
  })
}

(async () => {
  let canFinish : any
  CONFIG.cookie = ''
  CONFIG.lastCreci = ''
  CONFIG.lastPage = ''
  do {
    canFinish = await main()
  } while (canFinish.status === false)
})()
