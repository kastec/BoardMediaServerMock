import { Express } from 'express';
import bodyParser from 'body-parser';
import { HelloController } from './controllers/HelloController';
import { MasterTabletController } from './controllers/MasterTabletController';

// Создаем экземпляр контроллера
const masterTabletController = new MasterTabletController();

export default function routes(app: Express): void {
  app.post('/api/register', HelloController.register);
  
  // Master tablet registration and proxy
  app.post('/api/master-tablet/register', masterTabletController.register);
  // Используем raw body parser для proxy, чтобы поддерживать бинарные данные
  // app.all обрабатывает все HTTP методы (GET, POST, PUT, DELETE, PATCH и т.д.)
  app.all('/api/proxy/*', bodyParser.raw({ type: '*/*', limit: '100mb' }), masterTabletController.proxy);
}



