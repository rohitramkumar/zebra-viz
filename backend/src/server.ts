import express from 'express';
import cors from 'cors';
import { referees } from './data';
import { RefereeListItem } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/referees', (_req, res) => {
  const refereeList: RefereeListItem[] = referees.map(ref => ({
    id: ref.id,
    name: ref.name,
    gameCount: ref.games.length,
  }));
  res.json(refereeList);
});

app.get('/api/referees/:id', (req, res) => {
  const referee = referees.find(r => r.id === req.params.id);
  if (!referee) {
    return res.status(404).json({ error: 'Referee not found' });
  }
  return res.json(referee);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
