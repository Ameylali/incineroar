import { Card } from 'antd';

import { type Turn } from '@/src/types/api';

import Action from './Action';

interface TurnProps {
  turn: Turn;
}

const Turn = ({ turn }: TurnProps) => {
  return (
    <Card title={`Turn ${turn.index + 1}`}>
      {turn.actions.map((action, index) => (
        <Action key={index} action={action} />
      ))}
    </Card>
  );
};

export default Turn;
