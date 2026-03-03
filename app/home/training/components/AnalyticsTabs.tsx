import { Tabs, TabsProps } from 'antd';

import {
  BattlePokemonAnalytics,
  KeyActionsAnalytics,
  MatchupAnalytics,
  TrainingAnalytics,
} from '@/src/types/api';

import {
  TrainingMatchupAnalyticsTable,
  TrainingPokemonAnalyticsTable,
  TrainingPokemonKeyActionsTable,
  TrainingPokemonKoOrFaintAnalyticsTable,
  TrainingPokemonMovesAnalyticsTable,
  TurnMapTable,
} from './Analytics';

interface MatchupTabProps {
  all: MatchupAnalytics[];
  openings: MatchupAnalytics[];
}

export const MatchupTab = ({ all, openings }: MatchupTabProps) => {
  const items: TabsProps['items'] = [
    {
      key: 'all',
      label: 'All Matches',
      children: <TrainingMatchupAnalyticsTable matchups={all} />,
    },
    {
      key: 'openings',
      label: 'Openings',
      children: <TrainingMatchupAnalyticsTable matchups={openings} />,
    },
  ];

  return <Tabs tabPosition="left" items={items} />;
};

interface PokemonTabProps {
  pokemonAnalytics: BattlePokemonAnalytics[];
}

export const PokemonTab = ({ pokemonAnalytics }: PokemonTabProps) => {
  const items: TabsProps['items'] = [
    {
      key: 'usage',
      label: 'Usage',
      children: (
        <TrainingPokemonAnalyticsTable pokemonAnalytics={pokemonAnalytics} />
      ),
    },
    {
      key: 'moves',
      label: 'Moves',
      children: (
        <TrainingPokemonMovesAnalyticsTable
          pokemonAnalytics={pokemonAnalytics}
        />
      ),
    },
    {
      key: 'kos',
      label: 'KOs',
      children: (
        <TrainingPokemonKoOrFaintAnalyticsTable
          pokemonAnalytics={pokemonAnalytics}
          columnTitle="KOs"
          dataIndex="ko"
        />
      ),
    },
    {
      key: 'faints',
      label: 'Faints',
      children: (
        <TrainingPokemonKoOrFaintAnalyticsTable
          pokemonAnalytics={pokemonAnalytics}
          columnTitle="Faints"
          dataIndex="faint"
        />
      ),
    },
  ];

  return <Tabs tabPosition="left" items={items} />;
};

interface KeyActionsTabProps {
  keyActions: KeyActionsAnalytics;
}

export const KeyActionsTab = ({ keyActions }: KeyActionsTabProps) => {
  const items: TabsProps['items'] = [
    {
      key: 'kos',
      label: 'KOs',
      children: <TurnMapTable turnMap={keyActions.kos} />,
    },
    {
      key: 'faints',
      label: 'Faints',
      children: <TurnMapTable turnMap={keyActions.faints} />,
    },
    {
      key: 'switches',
      label: 'Switches',
      children: <TurnMapTable turnMap={keyActions.switches} />,
    },
    {
      key: 'my-pokemon-key-actions',
      label: 'My pokemon key actions',
      children: (
        <TrainingPokemonKeyActionsTable
          pokemonKeyActions={keyActions.pokemonKeyActions.byMe}
        />
      ),
    },
    {
      key: 'rival-pokemon-key-actions',
      label: 'Rival pokemon key actions',
      children: (
        <TrainingPokemonKeyActionsTable
          pokemonKeyActions={keyActions.pokemonKeyActions.byRival}
        />
      ),
    },
  ];

  return <Tabs tabPosition="left" items={items} />;
};

export const createAnalyticsTabItems = (
  analysis: TrainingAnalytics,
): TabsProps['items'] => [
  {
    key: 'matchups',
    label: 'Matchups',
    children: (
      <MatchupTab
        all={analysis.matchups.all}
        openings={analysis.matchups.openings}
      />
    ),
  },
  {
    key: 'pokemon',
    label: 'Pokemon',
    children: <PokemonTab pokemonAnalytics={analysis.pokemon} />,
  },
  {
    key: 'key-actions',
    label: 'Key Actions',
    children: <KeyActionsTab keyActions={analysis.keyActions} />,
  },
];
