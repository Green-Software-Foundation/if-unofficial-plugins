import {TimerStart} from '../../../../lib';
import {STRINGS} from '../../../../config';

const {TIMER} = STRINGS;

describe('lib/timer', () => {
  describe('TimerStart:', () => {
    describe('init timer: ', () => {
      it('initalizes timer start with required properties', () => {
        const timerStart = TimerStart();

        expect.assertions(2);

        expect(timerStart).toHaveProperty('metadata');
        expect(timerStart).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {
      it('writes an ISO time string with the current time to input', async () => {
        const timestamp = 1609459200000;
        const timestampISO = new Date(timestamp).toISOString();

        jest.spyOn(Date, 'now').mockImplementation(() => timestamp);

        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        const {execute} = TimerStart();
        await expect(execute(inputs)).resolves.toEqual([
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            'timer/start': timestampISO,
          },
        ]);
      });

      it('throws an error if there is already a start time for this input', async () => {
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            'timer/start': '2021-01-01T00:00:00Z',
          },
        ];

        const {execute} = TimerStart();
        await expect(execute(inputs)).rejects.toThrow(
          TIMER.ERROR_MESSAGE_EXISTING_START
        );
      });
    });
  });
});
