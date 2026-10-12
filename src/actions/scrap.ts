import { JSDOM } from 'jsdom';

import DBConnection from '../db/DBConnection';
import TournamentRepository from '../db/models/tournament';
import EmailService from '../services/email';
import { Tournament } from '../types/api';
import { fetchRawData } from '../utils/fetch';
import { capitalize } from '../utils/string';
import { createTournamentWithAuth } from './tournament';

const POKEDATA_URL = 'https://pokedata.ovh/standingsVGC';

const notifyImportFailure = async (errors: string[]) => {
  try {
    const emailService = new EmailService();
    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL!,
      from: process.env.ADMIN_EMAIL!,
      subject: '[Ameylali - FakeOutLabs] Tournament import failed',
      body: errors.join('\n'),
    });
  } catch (err) {
    // notification failures must never mask the original import error
    console.error('Failed to send import failure notification email', err);
  }
};

const tryImportTournament = async (
  index: number,
  errors: string[],
): Promise<Tournament[]> => {
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

  const createdTournaments = [];

  for (const category of ['juniors', 'seniors', 'masters']) {
    const url = `${POKEDATA_URL}/${id}/${category}/${id}_${capitalize(category)}.json`;
    const name = `${title} - ${capitalize(category)}`;
    const existingTournament = await tournamentRepo.findByName(name);

    if (existingTournament) {
      console.log(`${name} tournament already exists`);
      continue;
    }

    try {
      const tournament = await createTournamentWithAuth({
        name,
        season: year ? Number(year) : new Date().getFullYear(),
        format: 'unknown',
        source: 'pokedata_url',
        data: url,
      });
      createdTournaments.push(tournament);
    } catch (err) {
      console.error(`Failed to import ${url}`, err);
      errors.push(
        `Failed to import ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return createdTournaments;
};

export const importTournamentData = async (): Promise<Tournament[]> => {
  console.log('Fetching tournament data...');

  const errors: string[] = [];
  const createdTournaments: Tournament[] = [];

  try {
    const htmlData = await fetchRawData(POKEDATA_URL);
    const dom = new JSDOM(htmlData);
    const [_, firstButton] = dom.window.document.getElementsByTagName('button');

    if (!firstButton) {
      console.warn('No tournament buttons found on the page');
      errors.push('No tournament buttons found on the page');
      return [];
    }

    const match = firstButton.outerHTML.match(
      /onclick="location\.href='([^']+)\/'"/,
    );
    const lastIndex = match?.[1];

    if (!lastIndex) {
      console.warn('No tournament index found');
      errors.push('No tournament index found');
      return [];
    }

    console.log(`Found latest tournament index: ${lastIndex}`);

    for (let i = 1; i <= Number(lastIndex); i++) {
      const tournaments = await tryImportTournament(i, errors);
      createdTournaments.push(...tournaments);
    }
  } catch (err) {
    errors.push(
      `Fatal error during tournament import: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  } finally {
    if (errors.length > 0) {
      await notifyImportFailure(errors);
    }
  }

  return createdTournaments;
};
