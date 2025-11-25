import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { UserKeys } from '../constants/query-keys';
import { Team } from '../types/api';

const getTeam = async (id: string): Promise<Team> => {
  const result = await axios.get<{ team: Team }>(`/api/user/team/${id}`);
  return result.data.team;
};

const useTeamQuery = (id: string) => {
  return useQuery({
    queryKey: UserKeys.team(id),
    queryFn: () => getTeam(id),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export default useTeamQuery;
