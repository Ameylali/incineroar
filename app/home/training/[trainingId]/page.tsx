'use client';

import { Alert, Button, Col, Flex, Row } from 'antd';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { useTrainingQuery } from '@/src/hooks/training-queries';

import ImportBattles from '../components/ImportBattle';
import NewBattle from '../components/NewBattle';
import TrainingsOrBattlesTable from '../components/TrainingsOrBattlesTable';

const Page = ({ params }: { params: Promise<{ trainingId: string }> }) => {
  const { trainingId } = use(params);
  const { isLoading, data } = useTrainingQuery(trainingId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const goToAnalyze = () => {
    router.push(`/home/training/${trainingId}/analyze`);
  };

  return (
    <>
      {errorMessage && (
        <Row>
          <Alert type="error" message={errorMessage} />
        </Row>
      )}
      <Row className="mb-3">
        <Flex gap={3}>
          <NewBattle trainingId={trainingId} onError={setErrorMessage} />
          <ImportBattles training={data.training} />
          <Button onClick={goToAnalyze}>Analyze</Button>
        </Flex>
      </Row>
      <Row>
        <Col span={24}>
          <TrainingsOrBattlesTable
            isLoading={isLoading}
            trainingsAndBattles={data.training.battles}
            onEditTraining={() => {}}
            training={data.training}
          />
        </Col>
      </Row>
    </>
  );
};

export default Page;
