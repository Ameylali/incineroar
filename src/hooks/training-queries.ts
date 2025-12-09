import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { TrainingKeys } from '../constants/query-keys';
import { GET_TRAININGS } from '../types/endpoints';
import { queryClient } from '../utils/query-clients';

const getAllTrainings = async () => {
  const result = await axios.get<GET_TRAININGS>('/api/user/training');
  return result.data;
};

const deleteTraining = async (id: string) => {
  return await axios.delete(`/api/user/training/${id}`);
};

export const useDeleteTrainingMutation = (id: string) => {
  return useMutation({
    mutationFn: () => deleteTraining(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TrainingKeys.trainings(),
      });
      await queryClient.invalidateQueries({
        queryKey: TrainingKeys.training(id),
      });
    },
  });
};

export const useTrainigsQuery = () => {
  return useQuery({
    queryKey: TrainingKeys.trainings(),
    queryFn: getAllTrainings,
    staleTime: Infinity,
  });
};
