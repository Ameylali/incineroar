'use client';

import { Tabs } from 'antd';
import Title from 'antd/es/typography/Title';

import ExperimentsTab from './components/ExperimentsTab';
import PipelineTab from './components/PipelineTab';
import StructuredParserTab from './components/StructuredParserTab';

const GameplayParsingPage = () => (
  <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <Title level={2}>Gameplay Parsing Test Lab</Title>
    <Tabs
      defaultActiveKey="pipeline"
      items={[
        {
          key: 'pipeline',
          label: 'Pipeline',
          children: <PipelineTab />,
        },
        {
          key: 'experiments',
          label: 'Experiments',
          children: <ExperimentsTab />,
        },
        {
          key: 'structured-parser',
          label: 'Structured Parser',
          children: <StructuredParserTab />,
        },
      ]}
    />
  </div>
);

export default GameplayParsingPage;
