import { createTeamDataSchema, validateCreateTeamData } from './team';

describe('Team Actions', () => {
  describe('createTeamDataSchema', () => {
    const validTeamData = {
      name: 'Test Team',
      description: 'A test team for unit testing',
      data: JSON.stringify({
        species: ['Incineroar', 'Landorus-Therian', 'Rillaboom'],
        movesets: [
          'Fake Out + Flare Blitz',
          'Earthquake + U-turn',
          'Grassy Glide + Wood Hammer',
        ],
      }),
      season: 2024,
      format: 'VGC2024',
      tags: ['offensive', 'meta', 'tested'],
    };

    it('should validate correct team data', () => {
      const result = createTeamDataSchema.safeParse(validTeamData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTeamData);
      }
    });

    it('should reject empty team name', () => {
      const invalidData = { ...validTeamData, name: '' };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Name must be at least 1 characters',
        );
      }
    });

    it('should reject team name that is too long', () => {
      const invalidData = {
        ...validTeamData,
        name: 'A'.repeat(61), // Exceeds 60 character limit for tournament names
      };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Name must be at most',
        );
      }
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        ...validTeamData,
        description: 'A'.repeat(501), // Exceeds 500 character limit
      };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Description must be at most 500 characters',
        );
      }
    });

    it('should reject invalid season (too early)', () => {
      const invalidData = { ...validTeamData, season: 2007 };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Season must be 2008 or later',
        );
      }
    });

    it('should reject invalid season (too far in future)', () => {
      const currentYear = new Date().getFullYear();
      const invalidData = { ...validTeamData, season: currentYear + 2 };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Season cannot be in the future',
        );
      }
    });

    it('should reject too many tags', () => {
      const invalidData = {
        ...validTeamData,
        tags: Array(6).fill('tag'), // Exceeds 5 tag limit for limitedTags
      };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Cannot have more than',
        );
      }
    });

    it('should reject tags that are too long', () => {
      const invalidData = {
        ...validTeamData,
        tags: ['A'.repeat(21)], // Exceeds 20 character limit for limited tag length
      };
      const result = createTeamDataSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Tag must be at most 20 characters',
        );
      }
    });

    it('should allow empty description', () => {
      const validData = { ...validTeamData, description: '' };
      const result = createTeamDataSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should allow empty tags array', () => {
      const validData = { ...validTeamData, tags: [] };
      const result = createTeamDataSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name and tags', () => {
      const dataWithWhitespace = {
        ...validTeamData,
        name: '  Test Team  ',
        tags: ['  offensive  ', '  meta  '],
      };
      const result = createTeamDataSchema.safeParse(dataWithWhitespace);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Team');
        expect(result.data.tags).toEqual(['offensive', 'meta']);
      }
    });
  });

  describe('validateCreateTeamData', () => {
    it('should return success for valid data', () => {
      const validData = {
        name: 'Test Team',
        description: 'Test description',
        data: 'Test data content',
        season: 2024,
        format: 'VGC2024',
        tags: ['meta'],
      };

      const result = validateCreateTeamData(validData);
      expect(result.success).toBe(true);
    });

    it('should return error details for invalid data', () => {
      const invalidData = {
        name: '', // Invalid
        description: 'Test description',
        data: 'Test data content',
        season: 2007, // Invalid
        format: 'VGC2024',
        tags: ['meta'],
      };

      const result = validateCreateTeamData(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2); // name and season errors
        expect(
          result.error.issues.some((issue) =>
            issue.message.includes('Name must be at least'),
          ),
        ).toBe(true);
        expect(
          result.error.issues.some((issue) =>
            issue.message.includes('Season must be 2008'),
          ),
        ).toBe(true);
      }
    });
  });
});
