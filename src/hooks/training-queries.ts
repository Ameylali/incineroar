import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { TrainingKeys } from '../constants/query-keys';
import { GET_BATTLE, GET_TRAINING, GET_TRAININGS } from '../types/endpoints';
import { queryClient } from '../utils/query-clients';

const getAllTrainings = async () => {
  const result = await axios.get<GET_TRAININGS>('/api/user/training');
  return result.data;
};

const deleteTraining = async (id: string) => {
  return await axios.delete(`/api/user/training/${id}`);
};

const getTraining = async (id: string) => {
  const result = await axios.get<GET_TRAINING>(`/api/user/training/${id}`);
  return result.data;
};

const getBattle = async (trainingId: string, battleId: string) => {
  const result = await axios.get<GET_BATTLE>(
    `/api/user/training/${trainingId}/battle/${battleId}`,
  );
  return result.data;
};

export const useBattleQuery = (trainingId: string, battleId: string) => {
  return useQuery({
    queryKey: TrainingKeys.battle(trainingId, battleId),
    queryFn: () => getBattle(trainingId, battleId),
    staleTime: Infinity,
  });
};

export const useTrainingQuery = (id: string) => {
  return useQuery({
    queryKey: TrainingKeys.training(id),
    queryFn: () => getTraining(id),
    staleTime: Infinity,
  });
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
