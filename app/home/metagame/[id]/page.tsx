'use client';

import { ExpandAltOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Table, TableProps, Tabs, TabsProps } from 'antd';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { use, useState } from 'react';

import PokemonUsageCard from '@/src/components/PokemonUsageCard';
import TeamPreview from '@/src/components/TeamPreview';
import { useTournamentQuery } from '@/src/hooks/tournament-queries';
import {
  AnalyticsResponse,
  type PokemonAnalytics,
  TeamAnalytics,
  TournamentTeam,
} from '@/src/types/api';

const TeamsTable = Table<TournamentTeam>;
const PokemonAnalyticsTable = Table<PokemonAnalytics>;
const CoreAnalyticsTable = Table<TeamAnalytics>;

interface PokemonUsageModalProps {
  pokemon: PokemonAnalytics;
  isOpen: boolean;
  closeModal: () => void;
}

const PokemonUsageModal = ({
  isOpen,
  closeModal,
  pokemon,
}: PokemonUsageModalProps) => {
  return (
    <Modal open={isOpen} onCancel={closeModal} title={pokemon.species}>
      <div className="max-h-[70vh] overflow-y-auto">
        <PokemonUsageCard pokemon={pokemon} />
      </div>
    </Modal>
  );
};

interface TeamsTabProps {
  teams: TournamentTeam[];
}

const TeamsTab = ({ teams }: TeamsTabProps) => {
  const COLUMNS: TableProps<TournamentTeam>['columns'] = [
    {
      title: 'Player',
      dataIndex: 'player',
      key: 'player',
    },
    {
      title: 'Team',
      dataIndex: 'team',
      key: 'team',
      render: (team: TournamentTeam['team']) => <TeamPreview team={team} />,
    },
  ];

  return <TeamsTable columns={COLUMNS} dataSource={teams} />;
};

interface PokemonAnalyticsTableActionsProps {
  pokemon: PokemonAnalytics;
  showModal: () => void;
}

const PokemonAnalyticsTableActions = ({
  showModal,
}: PokemonAnalyticsTableActionsProps) => {
  return (
    <Button shape="circle" icon={<ExpandAltOutlined />} onClick={showModal} />
  );
};

interface PokemonAnalyticsProps {
  analysis: AnalyticsResponse;
}

const PokemonAnalytics = ({ analysis }: PokemonAnalyticsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPokemon, setSelectedPokemon] =
    useState<PokemonAnalytics | null>(null);
  const showModal = (pokemon: PokemonAnalytics) => {
    setIsModalOpen(true);
    setSelectedPokemon(pokemon);
  };
  const COLUMNS: TableProps<PokemonAnalytics>['columns'] = [
    {
      title: 'Preview',
      key: 'preview',
      render: (poke: PokemonAnalytics) => (
        <TeamPreview team={[{ species: poke.species }]} />
      ),
    },
    {
      title: 'Pokemon',
      dataIndex: 'species',
      key: 'pokemon',
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (poke: PokemonAnalytics) =>
        `${((poke.usage / analysis.totalTeamsCount) * 100).toFixed(2)}%`,
      sorter: (v1: PokemonAnalytics, v2: PokemonAnalytics) =>
        v1.usage - v2.usage,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'action',
      render: (poke: PokemonAnalytics) => (
        <PokemonAnalyticsTableActions
          pokemon={poke}
          showModal={() => showModal(poke)}
        />
      ),
    },
  ];
  return (
    <>
      <PokemonAnalyticsTable columns={COLUMNS} dataSource={analysis.pokemon} />
      {selectedPokemon && (
        <PokemonUsageModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          pokemon={selectedPokemon}
        />
      )}
    </>
  );
};

interface CoreAnalyticsProps {
  analysis: AnalyticsResponse;
  coreSize: number;
}

const CoreAnalytics = ({ analysis, coreSize }: CoreAnalyticsProps) => {
  const COLUMNS: TableProps<TeamAnalytics>['columns'] = [
    {
      title: 'Core',
      key: 'core',
      render: (team: TeamAnalytics) => (
        <TeamPreview team={team.pokemon.map((species) => ({ species }))} />
      ),
    },
    {
      title: 'Usage',
      key: 'usage',
      dataIndex: 'usage',
      render: (usage: number) =>
        `${((usage / analysis.totalTeamsCount) * 100).toFixed(2)}%`,
      sorter: (v1: TeamAnalytics, v2: TeamAnalytics) => v1.usage - v2.usage,
      defaultSortOrder: 'descend',
    },
  ];
  return (
    <CoreAnalyticsTable
      columns={COLUMNS}
      dataSource={analysis.cores[coreSize]}
    />
  );
};

interface AnalyticsTabProps {
  analysis?: AnalyticsResponse;
}

const AnalyticsTab = ({ analysis }: AnalyticsTabProps) => {
  if (!analysis) {
    return <h3>No analysis data</h3>;
  }

  const items: TabsProps['items'] = [
    {
      key: 'pokemon',
      label: 'Pokemon',
      children: <PokemonAnalytics analysis={analysis} />,
    },
    ...[2, 3, 4, 5, 6].map((size) => ({
      key: `core-${size}`,
      label: `Cores of ${size}`,
      children: <CoreAnalytics analysis={analysis} coreSize={size} />,
    })),
  ];

  return <Tabs tabPosition="left" defaultActiveKey="pokemon" items={items} />;
};

const Page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { data } = useTournamentQuery(id);

  const { tournament, analysis } = data;

  const items: TabsProps['items'] = [
    {
      key: 'teams',
      label: 'Teams',
      children: <TeamsTab teams={tournament.teams} />,
    },
    {
      key: 'analytics',
      label: 'Analytics',
      children: <AnalyticsTab analysis={analysis} />,
    },
  ];

  return (
    <Flex vertical>
      <div className="mb-3">
        <Title level={2}>{tournament.name}</Title>
        <Text>{`${tournament.season} - ${tournament.format}`}</Text>
      </div>
      <Tabs defaultActiveKey="teams" items={items} />
    </Flex>
  );
};

export default Page;
