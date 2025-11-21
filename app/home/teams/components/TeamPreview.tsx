import { Flex } from 'antd';

import PokemonSprite from '@/src/components/PokemonSprite';
import { type PokemonSet } from '@/src/services/pokemon';

interface TeamPreviewProps {
  team: Partial<PokemonSet>[];
}

const TeamPreview = ({ team }: TeamPreviewProps) => {
  return (
    <Flex>
      {team.map((pokemon, index) => (
        <PokemonSprite
          key={index}
          pokemon={pokemon.species}
          imageProps={{ width: 30, height: 30 }}
        />
      ))}
    </Flex>
  );
};

export default TeamPreview;
