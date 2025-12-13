'use client';

import { EditOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Skeleton } from 'antd';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { usePathname, useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import TeamPreview from '@/src/components/TeamPreview';
import { useBattleQuery } from '@/src/hooks/training-queries';
import useUserQuery from '@/src/hooks/useUserQuery';

import EditBattle from '../../components/EditBattle';
import Turn from '../../components/Turn';

const Page = ({
  params,
  searchParams,
}: PageProps<'/home/training/[trainingId]/[battleId]'>) => {
  const { trainingId, battleId } = use(params);
  const { edit } = use(searchParams);
  const [isEdit, setIsEdit] = useState(edit === 'true');
  const { isError, isLoading, data } = useBattleQuery(trainingId, battleId);
  const { isLoading: isUserLoading, data: userData } = useUserQuery();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams([['edit', isEdit ? 'true' : 'false']]);
    router.replace(
      `/home/training/${trainingId}/${battleId}?${params.toString()}`,
    );
  }, [isEdit, pathname, router, trainingId, battleId]);

  if (isLoading || isUserLoading) {
    return <Skeleton active />;
  }

  if (isError || !data) {
    return <h1>Error</h1>;
  }

  const { battle } = data;

  if (isEdit) {
    return (
      <EditBattle
        trainingId={trainingId}
        battle={battle}
        teams={userData?.teams ?? []}
        onCancel={() => setIsEdit(false)}
        onSuccess={() => setIsEdit(false)}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between">
        <Title level={2}>{battle.name}</Title>
        <Button icon={<EditOutlined />} onClick={() => setIsEdit(true)} />
      </Flex>
      <Flex className="mb-3" justify="space-between">
        {battle.season && battle.format && (
          <Text>{`${battle.season} - ${battle.format}`}</Text>
        )}
        {battle.team && <TeamPreview team={battle.team.parsedTeam} />}
      </Flex>
      <Flex vertical gap="small">
        <Card title="Notes">{battle.notes}</Card>
        {battle.turns.map((turn, index) => (
          <Turn key={index} turn={turn} />
        ))}
      </Flex>
    </>
  );
};

export default Page;
