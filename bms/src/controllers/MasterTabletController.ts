import { Request, Response } from 'express'
import axios from 'axios'

export class MasterTabletController {
	private masterTabletIp: string | null = null

	isRegistered = async (request: Request, response: Response) => {
		response.json({ isRegistered: !!this.masterTabletIp })
	}

	private isCorrectAddress = (ip:string) : boolean=>
	{
			// Валидация IP адреса с опциональным портом (базовая проверка)
			// Формат: IP или IP:PORT или localhost или localhost:PORT
			// Например: 192.168.1.1, 192.168.1.1:8080, localhost, localhost:8080
			const ipRegex = /^((\d{1,3}\.){3}\d{1,3}|localhost)(:\d+)?$/
			return ipRegex.test(ip);
	}

	register = async (request: Request, response: Response) => {
		try {
			const { payload } = request.body
			
			if (!payload || !payload.ip) {
				response.status(400).json({ error: 'Missing ip in payload' })
				return
			}

			const ip = payload.ip

			if (!this.isCorrectAddress(ip)) {
				response.status(400).json({ error: 'Invalid IP address format. Expected format: IP or IP:PORT or localhost or localhost:PORT (e.g., 192.168.1.1, 192.168.1.1:8080, localhost, localhost:8080)' })
				return
			}

			this.masterTabletIp = ip
			console.log(`Master tablet IP registered: ${ip}`)
			
			response.json({ success: true, ip })
		} catch (error) {
			console.error(error)
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			response.status(500).json({ error: errorMessage })
		}
	}

	private getHeader = (request: Request, prop: string): string | undefined =>
	{
		const senders = request.headers[prop]
		const from = Array.isArray(senders) ? senders[0] : senders
		return from 
	}

	proxy = async (request: Request, response: Response) => {
		try {
			const frm = this.getHeader(request, 'sender')
			const sendTo = this.getHeader(request, 'send-to')

			if(!sendTo){
				response.status(404).json({ error: 'Empty target IP (send-to)' })
				return
			}
		
			let targetIp = sendTo 

			// Если запрос для master планшета
			if (targetIp === 'master') {				
				if (!this.masterTabletIp) {
					response.status(404).json({ error: 'Master tablet IP not registered' })
					return
				}
				targetIp = this.masterTabletIp
			} 

			// Получаем путь из оригинального запроса
			// Убираем префикс /api/proxy из пути			
			let originalPath = request.path.replace(/^\/api\/proxy/, '')
			// Если путь пустой, используем /
			if (!originalPath || originalPath === '') {
				originalPath = '/'
			}
			
			// Строим URL с query параметрами
			const urlObj = new URL(`http://${targetIp}${originalPath}`)
			// Добавляем query параметры из request.query
			Object.keys(request.query).forEach(key => {
				const value = request.query[key]
				if (value !== undefined) {
					urlObj.searchParams.append(key, String(value))
				}
			})
			const url = urlObj.toString()

			// Копируем заголовки, исключая host и некоторые другие
			const headers: any = { ...request.headers }
			delete headers.host
			delete headers['content-length']
			delete headers.connection
			delete headers['transfer-encoding']
			// Удаляем заголовок SEND-TO, так как он нужен только для BMS
			delete headers['send-to']
			delete headers['SEND-TO']

			// Определяем метод запроса
			const method = request.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'

			// Проксируем запрос с поддержкой бинарных данных
			const axiosConfig: any = {
				method,
				url,
				headers,
				timeout: 30000, // 30 секунд таймаут
				responseType: 'arraybuffer', // Для поддержки бинарных данных
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
			}

			// Добавляем тело запроса для POST, PUT, PATCH
			// bodyParser.raw() всегда возвращает Buffer
			if (['post', 'put', 'patch'].includes(method)) {
				if (request.body !== undefined && request.body !== null) {
					// request.body уже является Buffer благодаря bodyParser.raw()
					axiosConfig.data = request.body
				}
			} 
			
			console.log(`Proxying from '${frm}' to ${method.toUpperCase()} ${url}`)

			const axiosResponse = await axios(axiosConfig)

			// Копируем заголовки ответа
			Object.keys(axiosResponse.headers).forEach(key => {
				// Пропускаем некоторые заголовки, которые Express установит сам
				if (key.toLowerCase() !== 'transfer-encoding' && 
				    key.toLowerCase() !== 'connection' &&
				    key.toLowerCase() !== 'content-encoding') {
					response.setHeader(key, axiosResponse.headers[key])
				}
			})

			// Отправляем ответ как Buffer для поддержки бинарных данных
			// axios с responseType: 'arraybuffer' всегда возвращает Buffer
			response.status(axiosResponse.status)
			response.send(Buffer.from(axiosResponse.data))
		} catch (error: any) {
			if (error?.response) {
				// Ответ получен, но статус код ошибки
				const errorData = error.response.data
				response.status(error.response.status)
				
				// Копируем заголовки ответа
				Object.keys(error.response.headers).forEach(key => {
					if (key.toLowerCase() !== 'transfer-encoding' && 
					    key.toLowerCase() !== 'connection' &&
					    key.toLowerCase() !== 'content-encoding') {
						response.setHeader(key, error.response.headers[key])
					}
				})
				
				// Отправляем данные как Buffer (может быть бинарными)
				if (errorData instanceof Buffer) {
					response.send(errorData)
				} else if (errorData instanceof ArrayBuffer) {
					response.send(Buffer.from(new Uint8Array(errorData)))
				} else {
					// Пытаемся отправить как JSON, если это возможно
					try {
						response.json(errorData)
					} catch {
						response.send(Buffer.from(String(errorData)))
					}
				}
			} else if (error?.request) {
				// Запрос отправлен, но ответа нет
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				console.error(`Master tablet request failed: ${errorMessage}`)
				response.status(503).json({ error: 'Master tablet unavailable', message: errorMessage })
			} else {
				// Ошибка при настройке запроса
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				console.error(`Master tablet proxy error: ${errorMessage}`)
				response.status(500).json({ error: errorMessage })
			}
		}
	}
}
