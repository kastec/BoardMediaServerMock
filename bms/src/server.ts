import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

const PORT = 6010;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


