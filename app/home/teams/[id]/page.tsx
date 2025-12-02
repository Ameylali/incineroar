'use client';

import { Flex, Skeleton, Tag } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { use } from 'react';

import PokemonSet from '@/src/components/PokemonSet';
import { useTeamQuery } from '@/src/hooks/team-queries';

const Page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { data, isError, isLoading } = useTeamQuery(id);

  if (isLoading) {
    return <Skeleton active />;
  }

  if (isError || !data) {
    return <h2>Error loading team</h2>;
  }

  return (
    <Flex vertical>
      <Title level={2}>{data.name}</Title>
      <Flex justify="space-between">
        <Text>{`${data.season} - ${data.format}`}</Text>
        <Flex>
          {data.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Flex>
      </Flex>
      <Paragraph>{data.description}</Paragraph>
      <Flex wrap>
        {data.parsedTeam.map((pokemon, index) => (
          <div key={pokemon.species || index} className="w-[50%]">
            <PokemonSet pokemon={pokemon} />
          </div>
        ))}
      </Flex>
    </Flex>
  );
};

export default Page;
