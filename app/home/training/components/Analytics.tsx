import { Button, List, Popover, Table, TableProps, theme } from 'antd';
import { useMemo } from 'react';

import PokemonSprite from '@/src/components/PokemonSprite';
import TeamPreview from '@/src/components/TeamPreview';
import TeamService from '@/src/services/pokemon/team';
import {
  BattleMovesAnalytics,
  BattlePokemonAnalytics,
  BattleResultAnalytics,
  MatchupAnalytics,
  PokemonKeyActionAnalytics,
  PokemonKoOrFaintAnalytics,
  TurnMap,
} from '@/src/types/api';
import { withKeys } from '@/src/utils/antd-adapters';
import { getContrastYIQ } from '@/src/utils/style';

interface ResultsBarChartProps {
  results: BattleResultAnalytics[];
}

const ResultsBarChart = ({ results }: ResultsBarChartProps) => {
  const { token } = theme.useToken();
  const totalCount = results.reduce((sum, result) => sum + result.count, 0);

  const order = { win: 0, tie: 1, loose: 2, unknown: 3 };

  // Sort results to ensure consistent ordering (wins first, losses last)
  const sortedResults = results.sort((a, b) => {
    return (
      (order[a.result as keyof typeof order] ?? 4) -
      (order[b.result as keyof typeof order] ?? 4)
    );
  });

  const segments = useMemo(() => {
    return sortedResults.map((result, index) => {
      const percentage = (result.count / totalCount) * 100;
      const cumulativePercent = sortedResults.reduce((sum, r, i) => {
        if (i < index) {
          return sum + (r.count / totalCount) * 100;
        }
        return sum;
      }, 0);
      const color =
        result.result === 'win'
          ? token.colorChartWin
          : result.result === 'loose'
            ? token.colorChartLose
            : result.result === 'tie'
              ? token.colorChartTie
              : token.colorChartNeutral;

      const segment = (
        <div
          key={result.result}
          style={{
            position: 'absolute',
            left: `${cumulativePercent}%`,
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius:
              index === 0
                ? '4px 0 0 4px'
                : index === sortedResults.length - 1
                  ? '0 4px 4px 0'
                  : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: getContrastYIQ(color),
          }}
          title={`${result.result}: ${result.count}`}
        >
          {percentage > 15 ? `${percentage.toFixed(0)}%` : ''}
        </div>
      );

      return segment;
    });
  }, [sortedResults, totalCount, token]);

  if (totalCount === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100px', height: '20px' }}>
      {segments}
    </div>
  );
};

const MatchupTable = Table<MatchupAnalytics>;
const teamService = new TeamService();

interface TrainingMatchupAnalyticsTableProps {
  matchups: MatchupAnalytics[];
}

export const TrainingMatchupAnalyticsTable = ({
  matchups,
}: TrainingMatchupAnalyticsTableProps) => {
  const COLUMNS: TableProps<MatchupAnalytics>['columns'] = [
    {
      title: 'Pokemon',
      dataIndex: 'pokemon',
      key: 'pokemon',
      render: (pokemon: string[]) => {
        const team = teamService.parseTeam(pokemon.join('\n\n'));
        return <TeamPreview team={team} />;
      },
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usage',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.usageCount - b.usageCount,
    },
    {
      title: 'Results',
      dataIndex: 'results',
      key: 'results',
      render: (results: MatchupAnalytics['results']) => (
        <ResultsBarChart results={results} />
      ),
    },
  ];
  return (
    <MatchupTable
      dataSource={withKeys(matchups)}
      columns={COLUMNS}
      expandable={{
        expandedRowRender: (row) => (
          <TrainingMatchupAnalyticsTable matchups={row.pairings ?? []} />
        ),
        rowExpandable: (row) => !!row.pairings && row.pairings.length > 0,
        columnTitle: 'Pairings',
      }}
    />
  );
};

const POKEMON_BASE_COLUMNS: TableProps<BattlePokemonAnalytics>['columns'] = [
  {
    key: 'icon',
    dataIndex: 'pokemon',
    render: (pokemon: BattlePokemonAnalytics['pokemon']) => (
      <PokemonSprite pokemon={pokemon} width={50} height={50} />
    ),
  },
  {
    title: 'Pokemon',
    dataIndex: 'pokemon',
    key: 'pokemon',
  },
];

interface TrainingPokemonAnalyticsTableProps {
  pokemonAnalytics: BattlePokemonAnalytics[];
}

export const TrainingPokemonAnalyticsTable = ({
  pokemonAnalytics,
}: TrainingPokemonAnalyticsTableProps) => {
  const COLUMNS: TableProps<BattlePokemonAnalytics>['columns'] = [
    ...POKEMON_BASE_COLUMNS,
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usage',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.usageCount - b.usageCount,
    },
  ];
  return <Table dataSource={withKeys(pokemonAnalytics)} columns={COLUMNS} />;
};

interface MovesAnalyticsTableProps {
  moves: BattleMovesAnalytics[];
}

const MovesAnalyticsTable = ({ moves }: MovesAnalyticsTableProps) => {
  const COLUMNS: TableProps<BattleMovesAnalytics>['columns'] = [
    {
      title: 'Move',
      dataIndex: 'move',
      key: 'move',
    },
    {
      title: 'Average Usage',
      dataIndex: 'averageUsage',
      key: 'averageUsage',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.averageUsage - b.averageUsage,
      render: (value: number) => `${(100 * value).toFixed(2)}%`,
    },
    {
      title: 'Expected Usage By Match',
      dataIndex: 'averageUsageByMatch',
      key: 'averageUsageByMatch',
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.averageUsageByMatch - b.averageUsageByMatch,
      render: (value: number) => value.toFixed(2),
    },
  ];
  return <Table dataSource={withKeys(moves)} columns={COLUMNS} />;
};

interface ExpandablePokemonAnalyticsTableProps
  extends TrainingPokemonAnalyticsTableProps {
  expandable: TableProps<BattlePokemonAnalytics>['expandable'];
  extraColumns?: TableProps<BattlePokemonAnalytics>['columns'];
}

const ExpandablePokemonAnalyticsTable = ({
  pokemonAnalytics,
  expandable,
  extraColumns,
}: ExpandablePokemonAnalyticsTableProps) => {
  const COLUMNS: TableProps<BattlePokemonAnalytics>['columns'] = [
    ...POKEMON_BASE_COLUMNS,
    ...(extraColumns ?? []),
  ];
  return (
    <Table
      dataSource={withKeys(pokemonAnalytics)}
      columns={COLUMNS}
      expandable={expandable}
    />
  );
};

export const TrainingPokemonMovesAnalyticsTable = ({
  pokemonAnalytics,
}: TrainingPokemonAnalyticsTableProps) => {
  return (
    <ExpandablePokemonAnalyticsTable
      pokemonAnalytics={pokemonAnalytics}
      expandable={{
        expandedRowRender: (record) => (
          <MovesAnalyticsTable moves={record.moves} />
        ),
        rowExpandable: (record) => record.moves && record.moves.length > 0,
        columnTitle: 'Moves',
      }}
    />
  );
};

interface KoOrFaintAnalyticsTableProps {
  kos: PokemonKoOrFaintAnalytics['matchups'];
}

const KoAnalyticsTable = ({ kos }: KoOrFaintAnalyticsTableProps) => {
  const TableC = Table<PokemonKoOrFaintAnalytics['matchups'][0]>;
  const COLUMNS: TableProps<
    PokemonKoOrFaintAnalytics['matchups'][0]
  >['columns'] = [
    {
      dataIndex: 'pokemon',
      key: 'icon',
      render: (pokemon: string) => (
        <PokemonSprite pokemon={pokemon} width={50} height={50} />
      ),
    },
    {
      title: 'Pokemon',
      dataIndex: 'pokemon',
      key: 'pokemon',
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.count - b.count,
    },
  ];
  return <TableC dataSource={withKeys(kos)} columns={COLUMNS} />;
};

interface TrainingPokemonKoOrFaintAnalyticsTableProps
  extends TrainingPokemonAnalyticsTableProps {
  columnTitle: string;
  dataIndex: 'ko' | 'faint';
}

export const TrainingPokemonKoOrFaintAnalyticsTable = ({
  pokemonAnalytics,
  columnTitle,
  dataIndex,
}: TrainingPokemonKoOrFaintAnalyticsTableProps) => {
  const EXTRA_COLUMNS: TableProps<BattlePokemonAnalytics>['columns'] = [
    {
      title: 'Total ' + columnTitle,
      dataIndex: ['performance', dataIndex, 'count'],
      key: 'total' + columnTitle,
      defaultSortOrder: 'descend',
      sorter: (a, b) =>
        a.performance[dataIndex].count - b.performance[dataIndex].count,
    },
  ];
  return (
    <ExpandablePokemonAnalyticsTable
      pokemonAnalytics={pokemonAnalytics}
      extraColumns={EXTRA_COLUMNS}
      expandable={{
        expandedRowRender: (record) => (
          <KoAnalyticsTable kos={record.performance[dataIndex].matchups} />
        ),
        rowExpandable: (record) =>
          record.performance[dataIndex].matchups &&
          record.performance[dataIndex].matchups.length > 0,
        columnTitle,
      }}
    />
  );
};

interface TurnMapTableProps {
  turnMap: TurnMap[];
}

export const TurnMapTable = ({ turnMap }: TurnMapTableProps) => {
  const COLUMNS: TableProps<TurnMap>['columns'] = [
    {
      title: 'Turn',
      dataIndex: 'turn',
      key: 'turn',
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.turn - b.turn,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
  ];
  return <Table dataSource={withKeys(turnMap)} columns={COLUMNS} />;
};

interface PokemonOrActionUsagePopoverListProps {
  usage:
    | PokemonKeyActionAnalytics['pokemonUsage']
    | PokemonKeyActionAnalytics['actionUsage'];
  label: string;
}

const UsageList = List<
  | PokemonKeyActionAnalytics['pokemonUsage'][0]
  | PokemonKeyActionAnalytics['actionUsage'][0]
>;

const PokemonOrActionUsageList = ({
  usage,
  label,
}: PokemonOrActionUsagePopoverListProps) => {
  const content = (
    <UsageList
      className="max-h-[50vh] overflow-y-auto"
      dataSource={usage}
      renderItem={(item) => (
        <List.Item>
          {'pokemon' in item ? (
            <PokemonSprite pokemon={item.pokemon} width={30} height={30} />
          ) : null}
          <span>
            {'pokemon' in item ? item.pokemon : item.action}: {item.count}
          </span>
        </List.Item>
      )}
    />
  );

  return (
    <Popover content={content} title={`${label} Usage`} trigger="click">
      <Button>{`View ${label} usage`}</Button>
    </Popover>
  );
};

interface TrainingPokemonKeyActionsTableProps {
  pokemonKeyActions: PokemonKeyActionAnalytics[];
}

export const TrainingPokemonKeyActionsTable = ({
  pokemonKeyActions,
}: TrainingPokemonKeyActionsTableProps) => {
  const COLUMNS: TableProps<PokemonKeyActionAnalytics>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Pokemon Usage',
      dataIndex: 'pokemonUsage',
      key: 'pokemonUsage',
      render: (pokemonUsage: PokemonKeyActionAnalytics['pokemonUsage']) => (
        <PokemonOrActionUsageList
          usage={pokemonUsage.sort((a, b) => b.count - a.count)}
          label="Pokemon"
        />
      ),
    },
    {
      title: 'Action Usage',
      dataIndex: 'actionUsage',
      key: 'actionUsage',
      render: (actionUsage: PokemonKeyActionAnalytics['actionUsage']) => (
        <PokemonOrActionUsageList
          usage={actionUsage.sort((a, b) => b.count - a.count)}
          label="Actions"
        />
      ),
    },
  ];
  return <Table dataSource={withKeys(pokemonKeyActions)} columns={COLUMNS} />;
};
