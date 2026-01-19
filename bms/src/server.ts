import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Проверяем, передан ли параметр "server"
const isServerMode = process.argv.includes('server');

routes(app, isServerMode);

// Получаем порт из аргументов командной строки или переменной окружения, по умолчанию 6010
// Ищем первый числовой аргумент среди всех аргументов
const portArg = process.argv.find(arg => !isNaN(parseInt(arg, 10)) && parseInt(arg, 10) > 0) || process.env.PORT;
const PORT = portArg ? parseInt(portArg, 10) : 6010;

if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('Invalid port number. Port must be between 1 and 65535.');
  process.exit(1);
}

const mode = isServerMode ? 'Board Media Server - PROXY' : 'CrewTablet Client';
console.log(`Mode: ${mode}`);
console.log(`Port: ${PORT}`);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


