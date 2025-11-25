import { useQuery } from '@tanstack/react-query';

import { PokemonKeys } from '../constants/query-keys';
import { itemClient } from '../utils/query-clients';

const getItem = async (rawName?: string) => {
  if (!rawName) {
    throw new Error('Can not fetch item. Missing item name');
  }
  const name = rawName?.toLowerCase().replaceAll(' ', '-');
  return await itemClient.getItemByName(name);
};

const useItemQuery = (name?: string) => {
  return useQuery({
    enabled: !!name,
    queryKey: PokemonKeys.item(name),
    queryFn: () => getItem(name),
    staleTime: Infinity,
  });
};

export default useItemQuery;
