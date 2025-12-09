'use client';

import { MoreOutlined } from '@ant-design/icons';
import { Button, Col, Dropdown, MenuProps, Row, Table, TableProps } from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  useDeleteTrainingMutation,
  useTrainigsQuery,
} from '@/src/hooks/training-queries';
import { Battle, Training } from '@/src/types/api';

import AddTraining, { EditTrainingModal } from './components/TrainingModals';

const TrainingsOrBattlesTable = Table<Training | Battle>;

interface ActionsMenuProps {
  trainingOrBattle: Training | Battle;
  onEdit: () => void;
}

const ActionsMenu = ({ trainingOrBattle, onEdit }: ActionsMenuProps) => {
  const { mutate } = useDeleteTrainingMutation(trainingOrBattle.id);
  const TRAINING_ITEMS: MenuProps['items'] = [
    {
      label: 'Edit',
      key: 'edit',
      onClick: onEdit,
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

const Page = () => {
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
        <Link
          href={`/home/training${'turns' in trainingOrBattle ? '/quick-battle' : ''}/${trainingOrBattle.id}`}
        >
          {name}
        </Link>
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
          onEdit={() =>
            setSelectedTraining(
              'turns' in trainingOrBattle ? null : trainingOrBattle,
            )
          }
          trainingOrBattle={trainingOrBattle}
        />
      ),
    },
  ];
  const { isLoading, isError, data } = useTrainigsQuery();
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(
    null,
  );
  const trainingsAndBattles = useMemo(() => {
    const trainings = data?.trainings ?? [];
    const battles = trainings.find(({ isDefault }) => isDefault)?.battles ?? [];
    const trainingsAndBattles = [
      ...battles,
      ...trainings.filter(({ isDefault }) => !isDefault),
    ];
    trainingsAndBattles.sort(({ createdAt: a }, { createdAt: b }) =>
      a.localeCompare(b),
    );
    return trainingsAndBattles.map((t) => ({
      key: t.id,
      ...t,
    }));
  }, [data]);

  if (isError) {
    return <h1>Error</h1>;
  }

  return (
    <>
      <Row className="mb-3">
        <AddTraining />
      </Row>
      <Row>
        <Col span={24}>
          <TrainingsOrBattlesTable
            loading={isLoading}
            columns={COLUMNS}
            dataSource={trainingsAndBattles}
          />
        </Col>
      </Row>
      <EditTrainingModal
        closeModal={() => setSelectedTraining(null)}
        training={selectedTraining}
      />
    </>
  );
};

export default Page;
