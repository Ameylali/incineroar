'use client';

import { Tabs } from 'antd';
import { use } from 'react';

import { useTrainingAnalysisQuery } from '@/src/hooks/training-queries';

import { createAnalyticsTabItems } from '../../components/AnalyticsTabs';

const Page = ({ params }: PageProps<'/home/training/[trainingId]/analyze'>) => {
  const { trainingId } = use(params);
  const { data } = useTrainingAnalysisQuery(trainingId);

  const items = createAnalyticsTabItems(data.analysis);

  return (
    <>
      <Tabs items={items} />
    </>
  );
};

export default Page;
