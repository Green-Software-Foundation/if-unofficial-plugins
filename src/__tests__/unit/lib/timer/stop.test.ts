import {TimerStop} from '../../../../lib';
import {STRINGS} from '../../../../config';

const {TIMER} = STRINGS;

describe('lib/timer', () => {
  describe('TimerStop:', () => {
    describe('init timer: ', () => {
      it('initalizes timer stop with required properties', () => {
        const timerStop = TimerStop();

        expect.assertions(2);

        expect(timerStop).toHaveProperty('metadata');
        expect(timerStop).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {
      it('sets time and duration, and deletes empty resets if reset is true', async () => {
        const timestamp = 1704153600000; // 2024-01-02T00:00:00Z

        jest.spyOn(Date, 'now').mockImplementation(() => timestamp);

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            resets: [true],
            'timer/start': '2024-01-01T00:00:00Z',
          },
        ];

        const {execute} = TimerStop();
        await expect(execute(inputs)).resolves.toEqual([
          {
            timestamp: '2024-01-01T00:00:00Z',
            duration: 86400, // seconds in a day
          },
        ]);
      });

      it('sets time and duration correctly if reset is false, and handles resets with length > 1 correctly', async () => {
        const timestamp = 1704153600000; // 2024-01-02T00:00:00Z

        jest.spyOn(Date, 'now').mockImplementation(() => timestamp);

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            resets: [false, true],
            'timer/start': '2024-01-01T00:00:00Z',
          },
        ];

        const {execute} = TimerStop();
        await expect(execute(inputs)).resolves.toEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 90000, // 3600 + 86400 (seconds in a day)
            resets: [true],
          },
        ]);
      });

      it('throws an error if there is no start time for this input', async () => {
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        const {execute} = TimerStop();
        await expect(execute(inputs)).rejects.toThrow(
          TIMER.ERROR_MESSAGE_MISSING_START.toLowerCase()
        );
      });

      it('throws an error if the resets array is empty for this input', async () => {
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            resets: [],
          },
        ];

        const {execute} = TimerStop();
        await expect(execute(inputs)).rejects.toThrow(
          TIMER.ERROR_MESSAGE_RESETS.toLowerCase()
        );
      });
    });
  });
});
