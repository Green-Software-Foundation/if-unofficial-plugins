import {hosting} from '@tgwf/co2';
import {getDomain} from 'tldjs';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations';

import {PluginInterface} from '../../interfaces';
import {PluginParams} from '../../types/common';

export const GreenHosting = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  /**
   * Executes the green hosting check for given url.
   */
  const execute = async (inputs: PluginParams[]): Promise<PluginParams[]> => {
    return await Promise.all(
      inputs.map(async input => {
        const validatedInput = validateSingleInput(input);
        const domain = getDomain(validatedInput.url);
        return {
          ...input,
          'green-web-host': domain ? await hosting.check(domain) : undefined,
        };
      })
    );
  };

  /**
   * Validates the input parameters of the green hosting model.
   */
  const validateSingleInput = (input: PluginParams) => {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  };

  return {
    metadata,
    execute,
  };
};
