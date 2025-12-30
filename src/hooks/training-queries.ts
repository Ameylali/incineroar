import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

import { TrainingKeys } from '../constants/query-keys';
import {
  DELETE_BATTLE,
  GET_BATTLE,
  GET_TRAINING,
  GET_TRAINING_ANALYSIS,
  GET_TRAININGS,
} from '../types/endpoints';
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

const deleteBattle = async (trainingId: string, battleId: string) => {
  return await axios.delete<DELETE_BATTLE>(
    `/api/user/training/${trainingId}/battle/${battleId}`,
  );
};

const getTrainingAnalysis = async (trainingId: string) => {
  const result = await axios.get<GET_TRAINING_ANALYSIS>(
    `/api/user/training/${trainingId}/analyze`,
  );
  return result.data;
};

export const useTrainingAnalysisQuery = (trainingId: string) => {
  return useSuspenseQuery({
    queryKey: TrainingKeys.trainingAnalysis(trainingId),
    queryFn: () => getTrainingAnalysis(trainingId),
    staleTime: Infinity,
  });
};

export const useDeleteBattleMutation = (
  trainingId: string,
  battleId: string,
) => {
  return useMutation({
    mutationFn: () => deleteBattle(trainingId, battleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TrainingKeys.trainings(),
      });
      await queryClient.invalidateQueries({
        queryKey: TrainingKeys.training(trainingId),
      });
      await queryClient.invalidateQueries({
        queryKey: TrainingKeys.battle(trainingId, battleId),
      });
    },
  });
};

export const useBattleQuery = (trainingId: string, battleId: string) => {
  return useSuspenseQuery({
    queryKey: TrainingKeys.battle(trainingId, battleId),
    queryFn: () => getBattle(trainingId, battleId),
    staleTime: Infinity,
  });
};

export const useTrainingQuery = (id: string) => {
  return useSuspenseQuery({
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
  return useSuspenseQuery({
    queryKey: TrainingKeys.trainings(),
    queryFn: getAllTrainings,
    staleTime: Infinity,
  });
};
