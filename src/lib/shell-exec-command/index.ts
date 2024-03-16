import {exec} from 'child_process';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types';

import {validate} from '../../util/validations';
import * as util from 'util';

export const execAsync = util.promisify(exec);

export const ShellExecCommand = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  /**
   * Execute the command for a list of inputs.
   */
  const execute = async (inputs: PluginParams[], config?: ConfigParams) => {
    const {command} = validateConfig(config);
    return await Promise.all(
      inputs.map(async input => {
        try {
          const {stdout} = await execAsync(command);
          return {...input, stdout: stdout.trim()};
        } catch (error) {
          console.log(`Error running the command: ${error}`);
          return input;
        }
      })
    );
  };

  /**
   * Checks for required fields in input.
   */
  const validateConfig = (config?: ConfigParams) => {
    const schema = z.object({
      command: z.string(),
    });

    return validate<z.infer<typeof schema>>(schema, config);
  };

  return {
    metadata,
    execute,
  };
};
