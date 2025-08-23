import express from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (_req, res) => {
  res.send('Cyprus Bus Stop API');
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
