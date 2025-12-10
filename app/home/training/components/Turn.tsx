import { Card } from 'antd';

import { type Turn } from '@/src/types/api';

import Action from './Action';

interface TurnProps {
  turn: Turn;
}

const Turn = ({ turn }: TurnProps) => {
  return (
    <Card title={`Turn ${turn.index}`}>
      {turn.actions.map((action) => (
        <Action key={action.id} action={action} />
      ))}
    </Card>
  );
};

export default Turn;
