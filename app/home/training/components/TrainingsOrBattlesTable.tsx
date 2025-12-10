import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Table, TableProps } from 'antd';
import { Route } from 'next';
import Link from 'next/link';

import { useDeleteTrainingMutation } from '@/src/hooks/training-queries';
import { Battle, Training } from '@/src/types/api';

const TableComponent = Table<Training | Battle>;

interface ActionsMenuProps {
  trainingOrBattle: Training | Battle;
  onEditTraining: (training: Training) => void;
}

const ActionsMenu = ({
  trainingOrBattle,
  onEditTraining,
}: ActionsMenuProps) => {
  const { mutate } = useDeleteTrainingMutation(trainingOrBattle.id);
  const TRAINING_ITEMS: MenuProps['items'] = [
    {
      label: 'Edit',
      key: 'edit',
      onClick: () =>
        !('turns' in trainingOrBattle) && onEditTraining(trainingOrBattle),
    },
    {
      label: 'Delete',
      key: 'delete',
      onClick: () => mutate(),
    },
  ];
  const BATTLE_ITEMS: MenuProps['items'] = [];
  const isBattle = 'turns' in trainingOrBattle;

  return (
    <Dropdown menu={{ items: isBattle ? BATTLE_ITEMS : TRAINING_ITEMS }}>
      <Button shape="circle" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

interface TrainingsOrBattlesTableProps {
  onEditTraining: (trainings: Training) => void;
  trainingsAndBattles: (Training | Battle)[];
  isLoading?: boolean;
  training?: Training;
}

const TrainingsOrBattlesTable = ({
  onEditTraining,
  training,
  trainingsAndBattles,
  isLoading,
}: TrainingsOrBattlesTableProps) => {
  const getTrainingOrBattlePath = (
    trainingOrBattle: Training | Battle,
  ): Route => {
    if (!('turns' in trainingOrBattle)) {
      return `/home/training/${trainingOrBattle.id}` as Route;
    }
    return `/home/training/${training?.id}/${trainingOrBattle.id}` as Route;
  };

  const COLUMNS: TableProps<Training | Battle>['columns'] = [
    {
      title: 'Type',
      key: 'type',
      render: (_, trainingOrBattle) =>
        'turns' in trainingOrBattle ? 'Battle' : 'Training',
    },
    {
      title: 'Training',
      dataIndex: 'name',
      key: 'name',
      render: (name, trainingOrBattle) => (
        <Link href={getTrainingOrBattlePath(trainingOrBattle)}>{name}</Link>
      ),
    },
    {
      title: 'Season',
      dataIndex: 'season',
      key: 'season',
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
    },
    {
      title: 'Actions',
      key: 'acions',
      render: (_, trainingOrBattle) => (
        <ActionsMenu
          onEditTraining={onEditTraining}
          trainingOrBattle={trainingOrBattle}
        />
      ),
    },
  ];

  return (
    <TableComponent
      loading={isLoading}
      columns={COLUMNS}
      dataSource={trainingsAndBattles}
    />
  );
};

export default TrainingsOrBattlesTable;
