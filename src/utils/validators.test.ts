import {
  createDataValidator,
  createDescriptionValidator,
  createFormatValidator,
  createNameValidator,
  createSeasonValidator,
  createTagsValidator,
  createTagValidator,
  validators,
} from './validators';

describe('Validation Utilities', () => {
  describe('createNameValidator', () => {
    it('should validate names with default 40 character limit', () => {
      const validator = createNameValidator();

      expect(validator.safeParse('Valid Name').success).toBe(true);
      expect(validator.safeParse('').success).toBe(false);
      expect(validator.safeParse('A'.repeat(41)).success).toBe(false);
      expect(validator.safeParse('   Test   ').data).toBe('Test'); // Should trim
    });

    it('should validate names with custom limit', () => {
      const validator = createNameValidator(20);

      expect(validator.safeParse('Valid Name').success).toBe(true);
      expect(validator.safeParse('A'.repeat(21)).success).toBe(false);
      expect(validator.safeParse('A'.repeat(20)).success).toBe(true);
    });

    it('should provide appropriate error messages', () => {
      const validator = createNameValidator(30);
      const result = validator.safeParse('A'.repeat(31));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name must be at most 30 characters',
        );
      }
    });
  });

  describe('createDescriptionValidator', () => {
    it('should validate descriptions with default 500 character limit', () => {
      const validator = createDescriptionValidator();

      expect(validator.safeParse('Valid description').success).toBe(true);
      expect(validator.safeParse('').success).toBe(true); // Empty allowed
      expect(validator.safeParse('A'.repeat(501)).success).toBe(false);
      expect(validator.safeParse('A'.repeat(500)).success).toBe(true);
    });

    it('should validate descriptions with custom limit', () => {
      const validator = createDescriptionValidator(100);

      expect(validator.safeParse('A'.repeat(100)).success).toBe(true);
      expect(validator.safeParse('A'.repeat(101)).success).toBe(false);
    });
  });

  describe('createDataValidator', () => {
    it('should validate data with default constraints', () => {
      const validator = createDataValidator();

      expect(validator.safeParse('Valid data').success).toBe(true);
      expect(validator.safeParse('').success).toBe(false); // Min 1 character
      expect(validator.safeParse('A'.repeat(5000)).success).toBe(true);
      expect(validator.safeParse('A'.repeat(5001)).success).toBe(false);
    });

    it('should validate data with custom constraints', () => {
      const validator = createDataValidator(5, 100);

      expect(validator.safeParse('Valid').success).toBe(true);
      expect(validator.safeParse('Test').success).toBe(false); // Less than 5 chars
      expect(validator.safeParse('A'.repeat(101)).success).toBe(false); // More than 100 chars
    });
  });

  describe('createSeasonValidator', () => {
    it('should validate valid seasons', () => {
      const validator = createSeasonValidator();
      const currentYear = new Date().getFullYear();

      expect(validator.safeParse(2008).success).toBe(true); // Min year
      expect(validator.safeParse(currentYear).success).toBe(true);
      expect(validator.safeParse(currentYear + 1).success).toBe(true); // Next year allowed

      expect(validator.safeParse(2007).success).toBe(false); // Before 2008
      expect(validator.safeParse(currentYear + 2).success).toBe(false); // Too far in future
    });

    it('should provide appropriate error messages', () => {
      const validator = createSeasonValidator();

      const tooEarly = validator.safeParse(2007);
      expect(tooEarly.success).toBe(false);
      if (!tooEarly.success) {
        expect(tooEarly.error.issues[0].message).toBe(
          'Season must be 2008 or later',
        );
      }

      const tooLate = validator.safeParse(9999);
      expect(tooLate.success).toBe(false);
      if (!tooLate.success) {
        expect(tooLate.error.issues[0].message).toBe(
          'Season cannot be in the future',
        );
      }
    });
  });

  describe('createFormatValidator', () => {
    it('should validate format strings', () => {
      const validator = createFormatValidator();

      expect(validator.safeParse('VGC2024').success).toBe(true);
      expect(validator.safeParse('').success).toBe(false); // Min 1 character
      expect(validator.safeParse('A'.repeat(50)).success).toBe(true);
      expect(validator.safeParse('A'.repeat(51)).success).toBe(false);
    });

    it('should validate format with custom limit', () => {
      const validator = createFormatValidator(10);

      expect(validator.safeParse('VGC2024').success).toBe(true);
      expect(validator.safeParse('A'.repeat(11)).success).toBe(false);
    });
  });

  describe('createTagValidator', () => {
    it('should validate individual tags', () => {
      const validator = createTagValidator();

      expect(validator.safeParse('meta').success).toBe(true);
      expect(validator.safeParse('').success).toBe(false);
      expect(validator.safeParse('  offensive  ').data).toBe('offensive'); // Should trim
      expect(validator.safeParse('A'.repeat(31)).success).toBe(false);
    });

    it('should validate tags with custom limit', () => {
      const validator = createTagValidator(10);

      expect(validator.safeParse('meta').success).toBe(true);
      expect(validator.safeParse('A'.repeat(11)).success).toBe(false);
    });
  });

  describe('createTagsValidator', () => {
    it('should validate tag arrays with default constraints', () => {
      const validator = createTagsValidator();

      expect(validator.safeParse(['meta', 'offensive']).success).toBe(true);
      expect(validator.safeParse([]).success).toBe(true); // Empty array allowed
      expect(validator.safeParse(Array(10).fill('tag')).success).toBe(true); // Max 10 tags
      expect(validator.safeParse(Array(11).fill('tag')).success).toBe(false); // Too many tags
    });

    it('should validate tag arrays with custom constraints', () => {
      const validator = createTagsValidator(3, 5);

      expect(validator.safeParse(['meta', 'test']).success).toBe(true);
      expect(validator.safeParse(['a', 'b', 'c', 'd']).success).toBe(false); // Too many tags
      expect(validator.safeParse(['toolong']).success).toBe(false); // Tag too long
    });

    it('should validate individual tags within the array', () => {
      const validator = createTagsValidator(5, 10);

      expect(validator.safeParse(['meta', 'offensive']).success).toBe(true);
      expect(validator.safeParse(['meta', 'verylongtag']).success).toBe(false); // Tag too long
      expect(validator.safeParse(['meta', '']).success).toBe(false); // Empty tag
    });
  });

  describe('pre-configured validators', () => {
    it('should have working name validator', () => {
      expect(validators.name.safeParse('Test Team').success).toBe(true);
      expect(validators.name.safeParse('A'.repeat(41)).success).toBe(false);
    });

    it('should have working teamName validator', () => {
      expect(validators.teamName.safeParse('Team Name').success).toBe(true);
      expect(validators.teamName.safeParse('A'.repeat(41)).success).toBe(false);
    });

    it('should have working tournamentName validator', () => {
      expect(
        validators.tournamentName.safeParse('Tournament Name').success,
      ).toBe(true);
      expect(validators.tournamentName.safeParse('A'.repeat(61)).success).toBe(
        false,
      );
    });

    it('should have working description validators', () => {
      expect(validators.description.safeParse('A'.repeat(500)).success).toBe(
        true,
      );
      expect(validators.description.safeParse('A'.repeat(501)).success).toBe(
        false,
      );

      expect(
        validators.shortDescription.safeParse('A'.repeat(250)).success,
      ).toBe(true);
      expect(
        validators.shortDescription.safeParse('A'.repeat(251)).success,
      ).toBe(false);
    });

    it('should have working data validators', () => {
      expect(validators.data.safeParse('Test data').success).toBe(true);
      expect(validators.data.safeParse('').success).toBe(false);

      expect(validators.battleData.safeParse('Battle data').success).toBe(true);
      expect(validators.battleData.safeParse('A'.repeat(10000)).success).toBe(
        true,
      );
      expect(validators.battleData.safeParse('A'.repeat(10001)).success).toBe(
        false,
      );
    });

    it('should have working season validator', () => {
      const currentYear = new Date().getFullYear();
      expect(validators.season.safeParse(2008).success).toBe(true);
      expect(validators.season.safeParse(currentYear).success).toBe(true);
      expect(validators.season.safeParse(2007).success).toBe(false);
    });

    it('should have working format validator', () => {
      expect(validators.format.safeParse('VGC2024').success).toBe(true);
      expect(validators.format.safeParse('').success).toBe(false);
    });

    it('should have working tag validators', () => {
      expect(validators.tag.safeParse('meta').success).toBe(true);
      expect(validators.tags.safeParse(['meta', 'offensive']).success).toBe(
        true,
      );
      expect(
        validators.limitedTags.safeParse(['a', 'b', 'c', 'd', 'e']).success,
      ).toBe(true);
      expect(
        validators.limitedTags.safeParse(['a', 'b', 'c', 'd', 'e', 'f'])
          .success,
      ).toBe(false);
    });
  });
});
