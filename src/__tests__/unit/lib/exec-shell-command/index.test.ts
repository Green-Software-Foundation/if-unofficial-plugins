import {ShellExecCommand} from '../../../../lib';
import * as execShell from '../../../../lib/shell-exec-command';
describe('lib/exec-shell-command', () => {
  describe('ExecShellCommand:', () => {
    describe('init ExecShellCommand: ', () => {
      it('initalizes ExecShellCommand with required properties', () => {
        const timerStart = ShellExecCommand();

        expect.assertions(2);

        expect(timerStart).toHaveProperty('metadata');
        expect(timerStart).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {
      it('executes the given command and writes stdout to input', async () => {
        const testString = 'exec command test';
        jest
          .spyOn(execShell, 'execAsync')
          .mockResolvedValue({stdout: testString, stderr: 'error'});

        const config = {command: 'sanity check command'};
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        const {execute} = ShellExecCommand();
        await expect(execute(inputs, config)).resolves.toEqual([
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            stdout: testString,
          },
        ]);
      });

      it('does not write anything to input if command exits with an error', async () => {
        jest
          .spyOn(execShell, 'execAsync')
          .mockRejectedValue(new Error('error executing command'));
        const log = jest.spyOn(console, 'log');

        const config = {command: ''};
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        const {execute} = ShellExecCommand();
        const result = await execute(inputs, config);
        expect(log).toHaveBeenCalledWith(
          'Error running the command: Error: error executing command'
        );
        expect(result).toEqual([
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
          },
        ]);
      });
    });
  });
});
