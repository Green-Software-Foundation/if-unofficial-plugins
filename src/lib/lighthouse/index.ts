import fs from 'fs';
import puppeteer, {KnownDevices} from 'puppeteer';
import {z} from 'zod';

import {validate} from '../../util/validations';

import {buildErrorMessage} from '../../util/helpers';
import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';
import lighthouse from 'lighthouse/core/index.cjs';
import {resolve} from 'path';

type Device = keyof typeof KnownDevices;

// TODO
// emulation for desktop? include lighthouse's emulation capabilities: https://github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md
// throttling
// add lighthouse config options to plugin config
// can I make use of custom user flows somehow?
// configure lighthouse audit with config file
export const Lighthouse = (): PluginInterface => {
  const errorBuilder = buildErrorMessage(Lighthouse.name);
  const metadata = {
    kind: 'execute',
    version: '0.1.0',
  };

  /**
   * Executes the measure webpage model for given inputs.
   */
  const execute = async (
    inputs: PluginParams[],
    config?: ConfigParams
  ): Promise<PluginParams[]> => {
    // const mergedValidatedConfig = Object.assign(
    //   {},
    //   validateGlobalConfig(),
    //   validateConfig(config)
    // );
    const validatedConfig = validateConfig(config);
    return await Promise.all(
      inputs.map(async input => {
        const validatedInput = Object.assign(input, validateSingleInput(input));
        const lighthouseResult = await measurePage(
          validatedInput.url,
          validatedConfig
        );

        if (!lighthouseResult) {
          throw new Error(
            errorBuilder({
              message: `Error during measurement of webpage. Lighthouse report is empty for ${validatedInput.url}.`,
            })
          );
        }

        const reportPath = writeReportToFile(
          lighthouseResult.report,
          validatedInput
        );

        return {
          ...input,
          'network/data/bytes':
            lighthouseResult?.lhr.audits['total-byte-weight'].numericValue,
          'lighthouse-report': reportPath,
        };
      })
    );
  };

  const measurePage = async (url: string, config?: ConfigParams) => {
    try {
      const browser = await puppeteer.launch();

      try {
        const page = await browser.newPage();
        if (config?.mobileDevice) {
          await page.emulate(KnownDevices[config.mobileDevice as Device]);
        }

        return await lighthouse(
          url,
          {
            output: 'html',
            logLevel: 'info',
          },
          undefined,
          page
        );
      } finally {
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during measurement of webpage: ${error}`,
        })
      );
    }
  };

  const escapeForFilePath = (url: string): string => {
    return url.replace(/[/\\?%*:|"<>]/g, '_');
  };

  const writeReportToFile = (
    lighthouseReport: string | string[],
    validatedInput: PluginParams
  ): string => {
    const timestamp = validatedInput['timer/start']
      ? validatedInput['timer/start']
      : validatedInput.timestamp;
    const unescapedOutputPath = resolve(
      `./lighthouse-report-${validatedInput.url}-${timestamp}.html`
    );
    const outputPath = escapeForFilePath(unescapedOutputPath);
    fs.writeFileSync(
      outputPath,
      Array.isArray(lighthouseReport)
        ? lighthouseReport.join(' ')
        : lighthouseReport,
      'utf8'
    );
    return outputPath;
  };

  /**
   * Validates the input parameters of the puppeteer model.
   */
  const validateSingleInput = (input: PluginParams) => {
    const schema = z.object({
      url: z.string({required_error: '`url` must be provided.'}),
      'timer/start': z.string().datetime().optional(),
      timestamp: z.string().datetime().optional(),
    });
    return validate<z.infer<typeof schema>>(schema, input);
  };

  // const ALLOWED_ENCODINGS = [
  //   'gzip',
  //   'compress',
  //   'deflate',
  //   'br',
  //   'zstd',
  //   'identity',
  //   '*',
  // ] as const;
  const configSchema = z
    .object({
      mobileDevice: z.string().optional(),
    })
    .optional()
    .refine(
      data => {
        if (data?.mobileDevice) {
          return KnownDevices[data?.mobileDevice as Device];
        }
        return true;
      },
      {
        message: `Mobile device must be one of: ${Object.keys(
          KnownDevices
        ).join(', ')}.`,
      }
    );

  /**
   * Validates config parameters.
   */
  const validateConfig = (config?: ConfigParams) => {
    return validate<z.infer<typeof configSchema>>(configSchema, config);
  };

  // /**
  //  * Validates Global config parameters.
  //  */
  // const validateGlobalConfig = () => {
  //   return validate<z.infer<typeof configSchema>>(
  //     configSchema,
  //     globalConfig || {}
  //   );
  // };

  return {
    metadata,
    execute,
  };
};
