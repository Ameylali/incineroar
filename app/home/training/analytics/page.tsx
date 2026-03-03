'use client';

import { Alert, Card, Tabs, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { useBulkTrainingAnalysisQuery } from '@/src/hooks/training-queries';

import { createAnalyticsTabItems } from '../components/AnalyticsTabs';

const { Title, Text } = Typography;

const BulkAnalyticsContent = () => {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');

  const trainingIds = useMemo(() => {
    if (!idsParam) return [];
    return idsParam.split(',').filter((id) => id.trim().length > 0);
  }, [idsParam]);

  // Always call the hook, but handle empty array case in the query function
  const { data } = useBulkTrainingAnalysisQuery(trainingIds);

  if (trainingIds.length === 0) {
    return (
      <Alert
        type="warning"
        message="No Training IDs Provided"
        description="Please select trainings from the main training page to analyze."
        showIcon
      />
    );
  }

  const items = createAnalyticsTabItems(data.analysis);

  return (
    <>
      <Card className="mb-4">
        <Title level={2}>Bulk Training Analysis</Title>
        <Text type="secondary">
          Analyzing {trainingIds.length} training session
          {trainingIds.length !== 1 ? 's' : ''}
        </Text>
      </Card>
      <Tabs items={items} />
    </>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <BulkAnalyticsContent />
    </Suspense>
  );
};

export default Page;
