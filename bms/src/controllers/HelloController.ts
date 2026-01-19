import { Request, Response } from 'express';
import axios from 'axios';

export class HelloController {
  static async register(req: Request, res: Response): Promise<void> {
    // Пример использования axios (можно удалить, если внешний запрос не нужен)
    try {
      await axios.get('https://httpbin.org/get');
    } catch {
      // Игнорируем возможные ошибки внешнего запроса
    }

    res.send('HEllo');
  }
}


