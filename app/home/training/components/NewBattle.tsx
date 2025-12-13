import { Button } from 'antd';
import { useRouter } from 'next/navigation';

import { TrainingKeys } from '@/src/constants/query-keys';
import { queryClient } from '@/src/utils/query-clients';

import { createBattle } from '../actions';

interface NewBattleProps {
  trainingId?: string;
  onError?: (message: string) => void;
}

const NewBattle = ({ trainingId, onError }: NewBattleProps) => {
  const router = useRouter();
  const onNewBattle = async () => {
    if (!trainingId) return;
    const battle = await createBattle(trainingId);
    if (!battle) {
      onError?.('Could not create new battle. Try again');
    }
    await queryClient.invalidateQueries({
      queryKey: TrainingKeys.training(trainingId),
    });
    router.push(`/home/training/${trainingId}/${battle?.id}?edit=true`);
  };

  if (!trainingId) {
    return null;
  }

  return (
    <Button type="primary" onClick={() => void onNewBattle()}>
      New battle
    </Button>
  );
};

export default NewBattle;
