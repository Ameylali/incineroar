import { z } from 'zod';

/**
 * Reusable validation schema builders to eliminate duplication across actions
 */

/**
 * Creates a name validation schema with configurable max length
 * Used for team names, tournament names, etc.
 */
export const createNameValidator = (maxLength: number = 40) =>
  z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 characters')
    .max(maxLength, `Name must be at most ${maxLength} characters`);

/**
 * Creates a description validation schema with configurable max length
 * Used for various entity descriptions
 */
export const createDescriptionValidator = (maxLength: number = 500) =>
  z
    .string()
    .max(maxLength, `Description must be at most ${maxLength} characters`);

/**
 * Creates a data/content validation schema with configurable length constraints
 * Used for team data, battle data, etc.
 */
export const createDataValidator = (
  minLength: number = 1,
  maxLength: number = 5000,
) =>
  z
    .string()
    .min(minLength, `Data must be at least ${minLength} characters`)
    .max(maxLength, `Data must be at most ${maxLength} characters`);

/**
 * Creates a season validation schema that accepts valid Pokémon seasons
 * From 2008 (first generation) to next year
 */
export const createSeasonValidator = () =>
  z
    .number()
    .min(2008, 'Season must be 2008 or later')
    .max(new Date().getFullYear() + 1, 'Season cannot be in the future');

/**
 * Creates a format validation schema for Pokémon battle formats
 */
export const createFormatValidator = (maxLength: number = 50) =>
  z
    .string()
    .min(1, 'Format must be specified')
    .max(maxLength, `Format must be at most ${maxLength} characters`);

/**
 * Creates a tag validation schema for entity tags
 */
export const createTagValidator = (maxLength: number = 30) =>
  z
    .string()
    .trim()
    .min(1, 'Tag cannot be empty')
    .max(maxLength, `Tag must be at most ${maxLength} characters`);

/**
 * Creates a tags array validation schema with configurable constraints
 */
export const createTagsValidator = (
  maxTags: number = 10,
  maxTagLength: number = 30,
) =>
  z
    .array(createTagValidator(maxTagLength))
    .max(maxTags, `Cannot have more than ${maxTags} tags`);

/**
 * Pre-configured common validators for consistency
 */
export const validators = {
  // Names with standard 40 character limit
  name: createNameValidator(),
  teamName: createNameValidator(40),
  tournamentName: createNameValidator(60),

  // Descriptions with standard 500 character limit
  description: createDescriptionValidator(),
  shortDescription: createDescriptionValidator(250),

  // Data fields with standard 5000 character limit
  data: createDataValidator(),
  battleData: createDataValidator(1, 10000),

  // Standard season validator
  season: createSeasonValidator(),

  // Format validators
  format: createFormatValidator(),

  // Tag validators
  tag: createTagValidator(),
  tags: createTagsValidator(),
  limitedTags: createTagsValidator(5, 20),
};

/**
 * Utility type to extract the inferred type from a Zod schema
 */
export type InferValidatorType<T> = T extends z.ZodType<infer U> ? U : never;
