import {z} from 'zod';

import {validate, atLeastOneDefined} from '../../../util/validations';
import {ERRORS} from '../../../util/errors';

const {InputValidationError} = ERRORS;

describe('Validations: ', () => {
  describe('validate(): ', () => {
    it('returns validated data if input is valid according to schema.', () => {
      const schema = z.object({
        timestamp: z.string(),
        duration: z.number(),
        energy: z.number(),
      });

      const input = {
        timestamp: '2023-12-12T00:00:00.000Z',
        energy: 10,
        duration: 60,
      };

      expect(validate(schema, input)).toEqual(input);
    });

    it('throws an error and prettify error message.', () => {
      const schema = z.object({
        energy: z.number(),
      });

      const invalidInput = {
        energy: 'invalidEnergy',
      };

      expect.assertions(2);

      try {
        validate(schema, invalidInput);
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect(error).toStrictEqual(
          new InputValidationError(
            '"energy" parameter is expected number, received string. Error code: invalid_type.'
          )
        );
      }
    });

    it('throws an error when not valid union is provided.', () => {
      const schema1 = z.object({
        energy: z.number(),
        7: z.string(),
      });

      const schema2 = z.object({
        timestamp: z.string(),
      });
      const invalidInput = {
        carbon: 'invalidEnergy',
        4: '2',
      };

      const schema = schema1.or(schema2);

      expect.assertions(2);
      try {
        validate(schema, invalidInput);
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect(error).toStrictEqual(
          new InputValidationError(
            '"7" parameter is required. Error code: invalid_union.'
          )
        );
      }
    });
  });

  describe('atLeastOneDefined(): ', () => {
    it('returns true if at least one value is defined', () => {
      const data = {
        a: 1,
        b: undefined,
        c: 'defined',
        d: null,
      };

      expect(atLeastOneDefined(data)).toBe(true);
    });

    it('returns false if all values are undefined', () => {
      const data = {
        a: undefined,
        b: undefined,
        c: undefined,
      };
      expect(atLeastOneDefined(data)).toBe(false);
    });

    it('returns true if at least one value is defined and others are undefined', () => {
      const data = {
        a: undefined,
        b: 'defined',
        c: undefined,
      };
      expect(atLeastOneDefined(data)).toBe(true);
    });

    it('returns true if at least one value is defined even if it is null', () => {
      const data = {
        a: null,
        b: undefined,
        c: undefined,
      };
      expect(atLeastOneDefined(data)).toBe(true);
    });

    it('returns true if at least one value is defined even if it is an empty string', () => {
      const data = {
        a: '',
        b: undefined,
        c: undefined,
      };
      expect(atLeastOneDefined(data)).toBe(true);
    });
  });
});
