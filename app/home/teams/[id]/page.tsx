'use client';

import { Flex, Tag } from 'antd';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import { use } from 'react';

import MarkdownText from '@/src/components/MarkdownText';
import PokemonSet from '@/src/components/PokemonSet';
import { useTeamQuery } from '@/src/hooks/team-queries';

const Page = ({ params }: PageProps<'/home/teams/[id]'>) => {
  const { id } = use(params);
  const { data } = useTeamQuery(id);

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
      <MarkdownText>{data.description}</MarkdownText>
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
