import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

import { UserKeys } from '../constants/query-keys';
import { Team } from '../types/api';
import { GET_TEAM } from '../types/endpoints';
import { queryClient } from '../utils/query-clients';

const getTeam = async (id: string): Promise<Team> => {
  const result = await axios.get<GET_TEAM>(`/api/user/team/${id}`);
  return result.data.team;
};

const deleteTeam = async (teamId: string) => {
  return await axios.delete(`/api/user/team/${teamId}`);
};

export const useDeleteTeamMutation = (teamId: string) => {
  return useMutation({
    mutationFn: () => deleteTeam(teamId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: UserKeys.me() });
    },
  });
};

export const useTeamQuery = (id: string) => {
  return useSuspenseQuery({
    queryKey: UserKeys.team(id),
    queryFn: () => getTeam(id),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
