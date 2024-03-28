import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {PluginParams} from '../../types';
import {validate} from '../../util/validations';
import {STRINGS} from '../../config';

const {TIMER} = STRINGS;

export const TimerStop = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  const execute = async (inputs: PluginParams[]) => {
    return inputs.map(input => {
      const {resets, ...validatedInput} = validateInput(input);
      const startTimeISOString = validatedInput['timer/start'];
      const startTime = new Date(startTimeISOString).getTime();

      const reset = resets.shift();
      const duration = (Date.now() - startTime) / 1000;
      delete input['timer/start'];
      if (resets.length === 0) delete input.resets;

      return {
        ...input,
        ...(reset && {timestamp: startTimeISOString}),
        ...(reset ? {duration} : {duration: input.duration + duration}),
        ...(resets.length > 0 && {resets}),
      };
    });
  };

  const validateInput = (input: PluginParams) => {
    const schema = z.object({
      resets: z
        .array(z.boolean())
        .min(1, {message: TIMER.ERROR_MESSAGE_RESETS}),
      'timer/start': z
        .string({required_error: TIMER.ERROR_MESSAGE_MISSING_START})
        .datetime(),
    });

    return validate<z.infer<typeof schema>>(schema, input);
  };

  return {
    metadata,
    execute,
  };
};
