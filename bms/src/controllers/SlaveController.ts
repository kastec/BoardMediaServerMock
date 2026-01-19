import { Request, Response } from 'express';

export class SlaveController {
  static async hello(req: Request, res: Response): Promise<void> {
    console.log(`Slave "hello"`)

    const currentTime = new Date().toISOString();
    res.json({ time: currentTime });
  }
}

