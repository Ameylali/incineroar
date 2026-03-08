'use client';

import { EditOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Tag } from 'antd';
import { PresetColorType } from 'antd/es/theme/interface';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { usePathname, useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import MarkdownText from '@/src/components/MarkdownText';
import TeamPreview from '@/src/components/TeamPreview';
import { useBattleQuery } from '@/src/hooks/training-queries';
import useUserQuery from '@/src/hooks/useUserQuery';
import { PokemonSet } from '@/src/services/pokemon';
import { Battle } from '@/src/types/api';

import EditBattle from '../../components/EditBattle';
import Turn from '../../components/Turn';

const BattleResultTagColorMap: Record<
  Exclude<Battle['result'], undefined>,
  keyof PresetColorType
> = {
  win: 'green',
  loose: 'red',
  tie: 'blue',
};

const extractTeams = (battle: Battle) => {
  const teamP1 = new Set<string>();
  const teamP2 = new Set<string>();
  battle.turns.forEach((turn) => {
    turn.actions.forEach((action) => {
      const [player, pokemonName] = action.user.includes(':')
        ? action.user.split(':')
        : [action.player, action.user];
      if (player === 'p1') {
        teamP1.add(pokemonName);
      } else if (player === 'p2') {
        teamP2.add(pokemonName);
      }
      action.targets.forEach((target) => {
        const [player, pokemonName] = target.includes(':')
          ? target.split(':')
          : [action.player, target];
        if (player === 'p1') {
          teamP1.add(pokemonName);
        } else if (player === 'p2') {
          teamP2.add(pokemonName);
        }
      });
    });
  });
  return {
    teamP1: Array.from(teamP1)
      .filter((v) => v && v.length > 0)
      .map((species) => ({ species })) as PokemonSet[],
    teamP2: Array.from(teamP2)
      .filter((v) => v && v.length > 0)
      .map((species) => ({ species })) as PokemonSet[],
  };
};

const Page = ({
  params,
  searchParams,
}: PageProps<'/home/training/[trainingId]/[battleId]'>) => {
  const { trainingId, battleId } = use(params);
  const { edit } = use(searchParams);
  const [isEdit, setIsEdit] = useState(edit === 'true');
  const { data } = useBattleQuery(trainingId, battleId);
  const { data: userData } = useUserQuery();
  const pathname = usePathname();
  const router = useRouter();
  const { battle } = data;

  useEffect(() => {
    const params = new URLSearchParams([['edit', isEdit ? 'true' : 'false']]);
    router.replace(
      `/home/training/${trainingId}/${battleId}?${params.toString()}`,
    );
  }, [isEdit, pathname, router, trainingId, battleId]);
  const { teamP1, teamP2 } = extractTeams(battle);

  if (isEdit) {
    return (
      <EditBattle
        trainingId={trainingId}
        battle={battle}
        teams={userData.teams}
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
      {battle.result && (
        <Text className="mb-3 block">
          {'Result: '}
          <Tag color={BattleResultTagColorMap[battle.result]}>
            {battle.result}
          </Tag>
        </Text>
      )}
      <Flex className="mb-3" justify="space-between">
        {battle.season && battle.format && (
          <Text>{`${battle.season} - ${battle.format}`}</Text>
        )}
        {battle.team && <TeamPreview team={battle.team.parsedTeam} />}
      </Flex>
      <Flex className="mb-3" align="center">
        <Text>My picked team:</Text>
        <TeamPreview team={teamP1} />
      </Flex>
      <Flex className="mb-3" align="center">
        <Text>Rival picked team:</Text>
        <TeamPreview team={teamP2} />
      </Flex>
      <Flex vertical gap="small">
        <Card title="Notes">
          <MarkdownText>{battle.notes}</MarkdownText>
        </Card>
        {battle.turns.map((turn, index) => (
          <Turn key={index} turn={turn} />
        ))}
      </Flex>
    </>
  );
};

export default Page;
