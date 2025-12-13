'use client';

import { Alert, Col, Flex, Row } from 'antd';
import { useMemo, useState } from 'react';

import { useTrainigsQuery } from '@/src/hooks/training-queries';
import { Training } from '@/src/types/api';

import NewBattle from './components/NewBattle';
import AddTraining, { EditTrainingModal } from './components/TrainingModals';
import TrainingsOrBattlesTable from './components/TrainingsOrBattlesTable';

const Page = () => {
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(
    null,
  );
  const { isLoading, isError, data } = useTrainigsQuery();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const defaultTraining = data?.trainings.find(({ isDefault }) => isDefault);
  const trainingsAndBattles = useMemo(() => {
    const trainings = data?.trainings ?? [];
    const battles = defaultTraining?.battles ?? [];
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
  }, [data, defaultTraining]);

  if (isError) {
    return <h1>Error</h1>;
  }

  return (
    <>
      {errorMessage && (
        <Row>
          <Alert type="error" message={errorMessage} />
        </Row>
      )}
      <Row className="mb-3">
        <Flex gap={3}>
          <AddTraining />
          {defaultTraining && (
            <NewBattle
              trainingId={defaultTraining.id}
              onError={setErrorMessage}
            />
          )}
        </Flex>
      </Row>
      <Row>
        <Col span={24}>
          <TrainingsOrBattlesTable
            isLoading={isLoading}
            trainingsAndBattles={trainingsAndBattles}
            onEditTraining={setSelectedTraining}
            training={defaultTraining}
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
