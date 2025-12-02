import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { MetagameKeys } from '../constants/query-keys';
import { GET_TOURNAMENTS } from '../types/endpoints';
import { queryClient } from '../utils/query-clients';

const getAllTournaments = async () => {
  const result = await axios.get<GET_TOURNAMENTS>('/api/tournament');
  return result.data;
};

const deleteTournament = async (id: string) => {
  return await axios.delete(`/api/tournament/${id}`);
};

export const useDeleteTournamentMutation = (id: string) => {
  return useMutation({
    mutationFn: () => deleteTournament(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: MetagameKeys.tournaments(),
      });
      await queryClient.invalidateQueries({
        queryKey: MetagameKeys.tournament(id),
      });
    },
  });
};

export const useTournamentsQuery = () => {
  return useQuery({
    queryKey: MetagameKeys.tournaments(),
    queryFn: getAllTournaments,
  });
};
