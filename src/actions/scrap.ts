import { JSDOM } from 'jsdom';

import DBConnection from '../db/DBConnection';
import TournamentRepository from '../db/models/tournament';
import { Tournament } from '../types/api';
import { fetchRawData } from '../utils/fetch';
import { capitalize } from '../utils/string';
import { createTournamentWithAuth } from './tournament';

const POKEDATA_URL = 'https://pokedata.ovh/standingsVGC';

const tryImportTournament = async (index: number): Promise<Tournament[]> => {
  console.log(`Trying to import tournament with id: ${index}`);
  const id = String(index).padStart(7, '0');

  const htmlData = await fetchRawData(`${POKEDATA_URL}/${id}`);
  const dom = new JSDOM(htmlData);
  const [titleElement] = dom.window.document.getElementsByTagName('h2');
  if (!titleElement) {
    console.warn('Title not found', htmlData);
    return [];
  }

  const title = titleElement.innerHTML;
  console.log(title, titleElement);

  if (title.length === 0) {
    console.warn('Missing title');
    return [];
  }

  const year = title?.match(/\d{4}/)?.[0];

  await DBConnection.connect();
  const tournamentRepo = new TournamentRepository();
  const existingTournament = await tournamentRepo.findByName(title);

  if (existingTournament) {
    console.log(`${title} tournament already exists`);
    return [];
  }

  const createdTournaments = [];

  for (const category of ['juniors', 'seniors', 'masters']) {
    const url = `${POKEDATA_URL}/${id}/${category}/${id}_${capitalize(category)}.json`;

    try {
      const tournament = await createTournamentWithAuth({
        name: `${title} - ${capitalize(category)}`,
        season: year ? Number(year) : new Date().getFullYear(),
        format: 'unknown',
        source: 'pokedata_url',
        data: url,
      });
      createdTournaments.push(tournament);
    } catch (err) {
      console.error(`Failed to import ${url}`, err);
    }
  }

  return createdTournaments;
};

export const importTournamentData = async (): Promise<Tournament[]> => {
  console.log('Fetching tournament data...');

  const htmlData = await fetchRawData(POKEDATA_URL);
  const dom = new JSDOM(htmlData);
  const [firstButton] = dom.window.document.getElementsByTagName('button');

  if (!firstButton) {
    console.warn('No tournament buttons found on the page');
    return [];
  }

  const match = firstButton.outerHTML.match(
    /onclick="location\.href='([^']+)\/'"/,
  );
  const lastIndex = match?.[1];

  if (!lastIndex) {
    console.warn('No tournament index found');
    return [];
  }

  console.log(`Found latest tournament index: ${lastIndex}`);

  const createdTournaments = [];

  for (let i = 1; i <= Number(lastIndex); i++) {
    const tournaments = await tryImportTournament(i);
    createdTournaments.push(...tournaments);
  }

  return createdTournaments;
};
