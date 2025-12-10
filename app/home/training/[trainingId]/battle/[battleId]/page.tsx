'use client';

import { Card, Flex, Skeleton } from 'antd';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { use } from 'react';

import TeamPreview from '@/src/components/TeamPreview';
import { useBattleQuery } from '@/src/hooks/training-queries';

import Turn from '../../../components/Turn';

const Page = ({
  params,
}: {
  params: Promise<{ trainingId: string; battleId: string }>;
}) => {
  const { trainingId, battleId } = use(params);
  const { isError, isLoading, data } = useBattleQuery(trainingId, battleId);

  if (isLoading) {
    return <Skeleton active />;
  }

  if (isError || !data) {
    return <h1>Error</h1>;
  }

  const { battle } = data;

  return (
    <>
      <Title level={2}>{battle.name}</Title>
      <Flex className="mb-3" justify="space-between">
        {battle.season && battle.format && (
          <Text>{`${battle.season} - ${battle.format}`}</Text>
        )}
        {battle.team && <TeamPreview team={battle.team.parsedTeam} />}
      </Flex>
      <Flex vertical gap="small">
        <Card title="Notes">{battle.notes}</Card>
        {battle.turns.map((turn) => (
          <Turn key={turn.id} turn={turn} />
        ))}
      </Flex>
    </>
  );
};

export default Page;
