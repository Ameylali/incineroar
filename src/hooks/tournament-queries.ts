import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

import { MetagameKeys } from '../constants/query-keys';
import {
  GET_TOURNAMENT,
  GET_TOURNAMENTS,
  PaginationParams,
} from '../types/endpoints';
import { queryClient } from '../utils/query-clients';

const getAllTournaments = async (params?: PaginationParams) => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const result = await axios.get<GET_TOURNAMENTS>(
    `/api/tournament?${searchParams.toString()}`,
  );
  return result.data;
};

const deleteTournament = async (id: string) => {
  return await axios.delete(`/api/tournament/${id}`);
};

const getTournament = async (id: string) => {
  const result = await axios.get<GET_TOURNAMENT>(`/api/tournament/${id}`);
  return result.data;
};

export const useTournamentQuery = (id: string) => {
  return useSuspenseQuery({
    queryKey: MetagameKeys.tournament(id),
    queryFn: () => getTournament(id),
    staleTime: Infinity,
  });
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

export const useTournamentsQuery = (params?: PaginationParams) => {
  return useQuery({
    queryKey: MetagameKeys.tournaments(params),
    queryFn: () => getAllTournaments(params),
  });
};
