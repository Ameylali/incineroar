'use client';

import { EditOutlined, RadarChartOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Flex, Row, Tabs } from 'antd';
import Text from 'antd/es/typography/Text';
import { TabsProps } from 'antd/lib';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import TeamPreview from '@/src/components/TeamPreview';
import { useTrainingQuery } from '@/src/hooks/training-queries';
import { Training } from '@/src/types/api';

import ImportBattles from '../components/ImportBattle';
import NewBattle from '../components/NewBattle';
import { EditTrainingModal } from '../components/TrainingModals';
import TrainingsOrBattlesTable from '../components/TrainingsOrBattlesTable';

interface TrainingTabProps {
  training: Training;
}

const TrainingTab = ({ training }: TrainingTabProps) => {
  return (
    <>
      <Flex className="mb-3" justify="space-between">
        {training.season && training.format && (
          <Text>{`${training.season} - ${training.format}`}</Text>
        )}
        {training.team && <TeamPreview team={training.team.parsedTeam} />}
      </Flex>
      <Text style={{ whiteSpace: 'pre-wrap' }}>{training.description}</Text>
    </>
  );
};

interface BattlesTabProps {
  training: Training;
}

const BattlesTab = ({ training }: BattlesTabProps) => {
  return (
    <TrainingsOrBattlesTable
      trainingsAndBattles={training.battles}
      onEditTraining={() => {}}
      training={training}
    />
  );
};

const Page = ({ params }: { params: Promise<{ trainingId: string }> }) => {
  const { trainingId } = use(params);
  const { data } = useTrainingQuery(trainingId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const goToAnalyze = () => {
    router.push(`/home/training/${trainingId}/analyze`);
  };
  const items: TabsProps['items'] = [
    {
      key: 'training',
      label: 'Training',
      children: <TrainingTab training={data.training} />,
    },
    {
      key: 'battles',
      label: 'Battles',
      children: <BattlesTab training={data.training} />,
    },
  ];

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
          <Button icon={<RadarChartOutlined />} onClick={goToAnalyze}>
            Analyze
          </Button>
          <Button icon={<EditOutlined />} onClick={() => setIsModalOpen(true)}>
            Edit
          </Button>
        </Flex>
      </Row>
      <Row>
        <Col span={24}>
          <Tabs defaultActiveKey="battles" items={items} />
        </Col>
      </Row>
      <EditTrainingModal
        isOpen={isModalOpen}
        training={data.training}
        closeModal={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Page;
