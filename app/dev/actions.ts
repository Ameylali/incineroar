'use server';

import { verifyUserAuth } from '@/src/actions/auth';
import DBConnection from '@/src/db/DBConnection';
import TeamRepository from '@/src/db/models/team';
import TournamentRepository from '@/src/db/models/tournament';
import UserRepository from '@/src/db/models/user';
import { CreateTeamData, CreateTournamentData } from '@/src/types/api';

const sampleTeam = `Mimikyu @ Focus Sash  
Ability: Disguise  
Tera Type: Ghost  

Vikavolt  
Ability: Levitate  
Tera Type: Bug  
IVs: 0 Atk  

Mudsdale  
Ability: Stamina  
Tera Type: Ground  
IVs: 0 Atk  

Toxapex  
Ability: Regenerator  
Tera Type: Poison  
IVs: 0 Atk  

Celesteela  
Ability: Beast Boost  
Tera Type: Steel  

Arcanine  
Ability: Intimidate  
Tera Type: Fire`;

export const testTeamsRepository = async () => {
  console.log('Starting script...');

  await DBConnection.connect();

  const userRepo = new UserRepository();
  const teamRepo = new TeamRepository();
  const { id: userId } = await verifyUserAuth();

  const newTeamData: CreateTeamData = {
    data: sampleTeam,
    tags: ['tag 1', 'tag 2'],
    name: `team created on ${new Date().toLocaleString()}`,
    description: 'My description',
    format: 'reg h',
    season: 2025,
  };

  console.log('Creating team');
  const createdTeam = await userRepo.addNewTeam(userId, newTeamData);
  console.log('Created team', createdTeam);

  console.log('Get all team');
  const user = await userRepo.getById(userId);
  console.log('Got all teams', user.teams);

  console.log('Updating team');
  const updatedTeam = await teamRepo.updateById(createdTeam.id, {
    description: `Updated on ${new Date().toISOString()}`,
    data: 'data updated',
  });
  const updatedTeam2 = await teamRepo.getById(createdTeam.id);
  console.log('Updated team', updatedTeam);
  console.log('Updated team2', updatedTeam2);

  console.log('Deleting team');
  await userRepo.deleteTeam(userId, createdTeam.id);
  console.log('Deleted team');
  const updatedUser = await userRepo.getById(userId);
  console.log('Updated user', updatedUser);
  try {
    await teamRepo.getById(createdTeam.id);
  } catch (e) {
    console.log('Not found team', e);
  }

  console.log('Done');
};

export const testCreateTournament = async () => {
  const tournament: CreateTournamentData = {
    name: `Tournament on ${new Date().toLocaleString()}`,
    season: new Date().getFullYear(),
    format: 'Reg h',
    teams: [
      {
        player: 'Player 1',
        data: sampleTeam,
      },
      {
        player: 'Player 2',
        data: sampleTeam,
      },
      {
        player: 'Player 3',
        data: sampleTeam,
      },
    ],
  };
  console.log('Creating tournament', tournament);
  await DBConnection.connect();
  const repo = new TournamentRepository();
  const createdT = await repo.create(tournament);
  console.log('Tournament created', createdT);
  const foundT = await repo.getById(createdT.id);
  console.log('Found tournament', foundT);
};

export const testDeleteTournament = async (formData: FormData) => {
  const id = formData.get('id');
  await DBConnection.connect();
  const repo = new TournamentRepository();
  console.log('Deleting team', id);
  await repo.deleteById(id);
  try {
    await repo.getById(id);
  } catch (err) {
    console.log('Not found deleted team', err);
  }
};
