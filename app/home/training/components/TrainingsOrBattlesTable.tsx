import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Table, TableProps } from 'antd';
import { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  useDeleteBattleMutation,
  useDeleteTrainingMutation,
} from '@/src/hooks/training-queries';
import { Battle, Training } from '@/src/types/api';

const TableComponent = Table<Training | Battle>;

interface BattleActionsMenuProps {
  training: Training;
  battle: Battle;
}

const BattleActionsMenu = ({ training, battle }: BattleActionsMenuProps) => {
  const { mutate } = useDeleteBattleMutation(training.id, battle.id);
  const router = useRouter();
  const ITEMS: MenuProps['items'] = [
    {
      label: 'Edit',
      key: 'edit',
      onClick: () =>
        router.push(`/home/training/${training.id}/${battle.id}?edit=true`),
    },
    {
      label: 'Delete',
      key: 'delete',
      onClick: () => mutate(),
    },
  ];

  return (
    <Dropdown menu={{ items: ITEMS }}>
      <Button shape="circle" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

interface TrainingActionsMenuProps {
  training: Training;
  onEditTraining: (training: Training) => void;
}

const TrainingActionsMenu = ({
  training,
  onEditTraining,
}: TrainingActionsMenuProps) => {
  const { mutate } = useDeleteTrainingMutation(training.id);
  const ITEMS: MenuProps['items'] = [
    {
      label: 'Edit',
      key: 'edit',
      onClick: () => onEditTraining(training),
    },
    {
      label: 'Delete',
      key: 'delete',
      onClick: () => mutate(),
    },
  ];

  return (
    <Dropdown menu={{ items: ITEMS }}>
      <Button shape="circle" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

interface TrainingsOrBattlesTableProps {
  onEditTraining: (trainings: Training) => void;
  trainingsAndBattles: (Training | Battle)[];
  isLoading?: boolean;
  training: Training;
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
      render: (_, trainingOrBattle) =>
        'turns' in trainingOrBattle ? (
          <BattleActionsMenu training={training} battle={trainingOrBattle} />
        ) : (
          <TrainingActionsMenu
            onEditTraining={onEditTraining}
            training={trainingOrBattle}
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
