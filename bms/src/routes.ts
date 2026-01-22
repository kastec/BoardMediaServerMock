import { Express } from 'express';
import bodyParser from 'body-parser';
import { HelloController } from './controllers/HelloController';
import { MasterTabletController } from './controllers/MasterTabletController';
import { SlaveController } from './controllers/SlaveController';

// Создаем экземпляр контроллера
const masterTabletController = new MasterTabletController();

export default function routes(app: Express, isServerMode: boolean = false): void {
	if (isServerMode) {
	  registerMasterTabletRoutes(app);
	} else {
	  registerSlaveRoutes(app);
	}
}

function registerMasterTabletRoutes(app: Express): void {
  // Master tablet registration and proxy
  app.post('/api/register', masterTabletController.register);
  app.get('/api/master-tablet/register', masterTabletController.isRegistered);
  // Используем raw body parser для proxy, чтобы поддерживать бинарные данные
  // app.all обрабатывает все HTTP методы (GET, POST, PUT, DELETE, PATCH и т.д.)
  app.all('/api/proxy/*', bodyParser.raw({ type: '*/*', limit: '100mb' }), masterTabletController.proxy);
}

function registerSlaveRoutes(app: Express): void {
  // Slave controller routes
  // Поддерживаем и GET и PUT методы для удобства тестирования
  app.get('/api/slave/hello', SlaveController.hello);
}


