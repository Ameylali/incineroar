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
        <div key={index} className="relative h-10 w-10">
          <PokemonSprite
            pokemon={pokemon?.species}
            imageProps={{ fill: true, style: { objectFit: 'contain' } }}
          />
        </div>
      ))}
    </Flex>
  );
};

export default TeamPreview;
