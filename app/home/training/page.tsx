'use client';

import { Alert, Button, Col, Flex, Row } from 'antd';
import { useRouter } from 'next/navigation';
import { Key } from 'react';
import { useMemo, useState } from 'react';

import { MAX_BULK_ANALYSIS_BATTLES } from '@/src/constants/training-limits';
import { useTrainigsQuery } from '@/src/hooks/training-queries';
import { Training } from '@/src/types/api';

import NewBattle from './components/NewBattle';
import AddTraining, { EditTrainingModal } from './components/TrainingModals';
import TrainingsOrBattlesTable from './components/TrainingsOrBattlesTable';

const Page = () => {
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(
    null,
  );
  const { isLoading, data } = useTrainigsQuery();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedTrainings, setSelectedTrainings] = useState<Training[]>([]);
  const router = useRouter();
  const defaultTraining = data?.trainings.find(({ isDefault }) => isDefault);
  const trainingsAndBattles = useMemo(() => {
    const trainings = data?.trainings ?? [];
    const battles = defaultTraining?.battles ?? [];
    const trainingsAndBattles = [
      ...battles,
      ...trainings.filter(({ isDefault }) => !isDefault),
    ];
    trainingsAndBattles.sort(({ createdAt: a }, { createdAt: b }) =>
      b.localeCompare(a),
    );
    return trainingsAndBattles.map((t) => ({
      key: t.id,
      ...t,
    }));
  }, [data, defaultTraining]);
  const fallbackDefaultTraining: Training = {
    id: '0',
    name: '',
    isDefault: true,
    createdAt: '',
    battles: [],
    description: '',
  };

  const handleSelectionChange = (
    selectedRowKeys: Key[],
    selectedRows: Training[],
  ) => {
    setSelectedRowKeys(selectedRowKeys);
    setSelectedTrainings(selectedRows);
  };

  const totalSelectedBattles = selectedTrainings.reduce(
    (total, training) => total + training.battles.length,
    0,
  );

  const handleBulkAnalyze = () => {
    if (totalSelectedBattles > MAX_BULK_ANALYSIS_BATTLES) {
      setErrorMessage(
        `Cannot analyze more than ${MAX_BULK_ANALYSIS_BATTLES.toLocaleString()} battles. Please reduce your selection.`,
      );
      return;
    }
    if (selectedTrainings.length === 0) {
      setErrorMessage('Please select at least one training to analyze.');
      return;
    }

    const trainingIds = selectedTrainings.map((t) => t.id).join(',');
    router.push(`/home/training/analytics?ids=${trainingIds}`);
  };

  return (
    <>
      {errorMessage && (
        <Row>
          <Alert type="error" message={errorMessage} />
        </Row>
      )}
      <Row className="mb-3">
        <Flex gap={3} justify="space-between" align="center">
          <Flex gap={3}>
            <AddTraining />
            {defaultTraining && (
              <NewBattle
                type="default"
                trainingId={defaultTraining.id}
                onError={setErrorMessage}
              />
            )}
          </Flex>
          {selectedTrainings.length > 0 && (
            <Button
              type="default"
              onClick={handleBulkAnalyze}
              disabled={totalSelectedBattles > MAX_BULK_ANALYSIS_BATTLES}
            >
              Analyze {selectedTrainings.length} selected
            </Button>
          )}
        </Flex>
      </Row>
      <Row>
        <Col span={24}>
          <TrainingsOrBattlesTable
            isLoading={isLoading}
            trainingsAndBattles={trainingsAndBattles}
            onEditTraining={setSelectedTraining}
            training={defaultTraining ?? fallbackDefaultTraining}
            enableRowSelection={true}
            selectedRowKeys={selectedRowKeys}
            onSelectionChange={handleSelectionChange}
          />
        </Col>
      </Row>
      <EditTrainingModal
        isOpen={!!setSelectedTraining}
        closeModal={() => setSelectedTraining(null)}
        training={selectedTraining}
      />
    </>
  );
};

export default Page;
