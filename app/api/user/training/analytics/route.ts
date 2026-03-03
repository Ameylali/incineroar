import { NextRequest, NextResponse } from 'next/server';

import { verifyUserAuth } from '@/src/actions/auth';
import { baseErrorHandler } from '@/src/actions/error-handlers';
import { MAX_BULK_ANALYSIS_BATTLES } from '@/src/constants/training-limits';
import DBConnection from '@/src/db/DBConnection';
import { TrainingNotFoundError } from '@/src/db/models/training';
import UserRepository from '@/src/db/models/user';
import { TrainingAnalyticsService } from '@/src/services/pokemon/analytics';
import { ErrorResponse, Training } from '@/src/types/api';
import { GET_TRAINING_ANALYSIS } from '@/src/types/endpoints';

export const GET = async (
  req: NextRequest,
): Promise<NextResponse<GET_TRAINING_ANALYSIS | ErrorResponse>> => {
  try {
    await DBConnection.connect();
    const userRepo = new UserRepository();
    const analyticsService = new TrainingAnalyticsService();

    const { id: userId } = await verifyUserAuth(req);

    // Get training IDs from query parameters
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { message: 'Training IDs are required in query parameter "ids"' },
        { status: 400 },
      );
    }

    const trainingIds = idsParam
      .split(',')
      .filter((id) => id.trim().length > 0);

    if (trainingIds.length === 0) {
      return NextResponse.json(
        { message: 'At least one training ID is required' },
        { status: 400 },
      );
    }

    // Fetch all specified trainings
    const trainings: Training[] = [];
    for (const trainingId of trainingIds) {
      try {
        const training = await userRepo.getTrainingById(userId, trainingId);
        // Only include explicitly created trainings (not default)
        if (!training.isDefault) {
          trainings.push(training);
        }
      } catch (error) {
        if (error instanceof TrainingNotFoundError) {
          return NextResponse.json(
            { message: `Training with ID ${trainingId} not found` },
            { status: 404 },
          );
        }
        throw error;
      }
    }

    if (trainings.length === 0) {
      return NextResponse.json(
        { message: 'No valid trainings found for analysis' },
        { status: 400 },
      );
    }

    // Collect all battles from selected trainings
    const allBattles = trainings.flatMap((training) => training.battles);

    // Check battle count limit
    if (allBattles.length > MAX_BULK_ANALYSIS_BATTLES) {
      return NextResponse.json(
        {
          message: `Too many battles selected (${allBattles.length}). Maximum allowed is ${MAX_BULK_ANALYSIS_BATTLES.toLocaleString()}.`,
        },
        { status: 400 },
      );
    }

    // Create a virtual training containing all battles for analysis
    const aggregatedTraining: Training = {
      id: 'bulk-analysis',
      name: `Bulk Analysis (${trainings.length} trainings)`,
      description: `Combined analysis of ${trainings.length} training sessions`,
      isDefault: false,
      battles: allBattles,
      createdAt: new Date().toISOString(),
    };

    // Generate analytics for the aggregated data
    const analysis = analyticsService.getAnalytics(aggregatedTraining);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Failed to get bulk training analysis', error);
    return baseErrorHandler(error, req);
  }
};
