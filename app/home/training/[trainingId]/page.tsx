'use client';

import { Alert, Col, Row } from 'antd';
import { use, useState } from 'react';

import { useTrainingQuery } from '@/src/hooks/training-queries';

import NewBattle from '../components/NewBattle';
import TrainingsOrBattlesTable from '../components/TrainingsOrBattlesTable';

const Page = ({ params }: { params: Promise<{ trainingId: string }> }) => {
  const { trainingId } = use(params);
  const { isLoading, isError, data } = useTrainingQuery(trainingId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <NewBattle trainingId={trainingId} onError={setErrorMessage} />
      </Row>
      <Row>
        <Col span={24}>
          <TrainingsOrBattlesTable
            isLoading={isLoading}
            trainingsAndBattles={data?.training.battles ?? []}
            onEditTraining={() => {}}
            training={data?.training}
          />
        </Col>
      </Row>
    </>
  );
};

export default Page;
