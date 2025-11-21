'use server';

import { verifyUserAuth } from '@/src/actions/auth';
import DBConnection from '@/src/db/DBConnection';
import TeamRepository from '@/src/db/models/team';
import UserRepository from '@/src/db/models/user';
import { CreateTeamData } from '@/src/types/api';

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
    regulation: 'reg h',
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
