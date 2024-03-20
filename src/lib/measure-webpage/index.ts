import puppeteer, {
  HTTPRequest,
  HTTPResponse,
  KnownDevices,
  Page,
  ResourceType,
} from 'puppeteer';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations';

import {buildErrorMessage} from '../../util/helpers';
import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';

type MeasurePageOptions = {
  reload: boolean;
  cacheEnabled: boolean;
  scrollToBottom?: boolean;
};

type Resource = {
  url: string;
  size: number;
  type: ResourceType;
  fromCache: boolean;
  fromServiceWorker: boolean;
};

type Device = keyof typeof KnownDevices;

// TODO
// emulateNetworkConditions, throttling
// login pages
export const MeasureWebpage = (
  globalConfig?: ConfigParams
): PluginInterface => {
  const errorBuilder = buildErrorMessage(MeasureWebpage.name);
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
    const mergedValidatedConfig = Object.assign(
      {},
      validateGlobalConfig(),
      validateConfig(config)
    );

    return await Promise.all(
      inputs.map(async input => {
        const validInput = Object.assign(input, validateSingleInput(input));
        const {pageWeight, resourceTypeWeights, dataReloadRatio} =
          await measurePage(
            validInput.url,
            !mergedValidatedConfig?.options?.dataReloadRatio,
            mergedValidatedConfig
          );

        return {
          ...input,
          'network/data/bytes': pageWeight,
          'network/data/resources/bytes': resourceTypeWeights,
          options: {
            ...input.options,
            dataReloadRatio,
          },
        };
      })
    );
  };

  const measurePage = async (
    url: string,
    computeReloadRatio: boolean,
    config?: ConfigParams
  ) => {
    const requestHandler = (interceptedRequest: HTTPRequest) => {
      const headers = Object.assign({}, interceptedRequest.headers(), {
        ...(config?.headers?.accept && {
          accept: `${config.headers.accept}`,
        }),
        ...(config?.headers['accept-encoding'] && {
          'accept-encoding': `${
            Array.isArray(config.headers['accept-encoding'])
              ? config.headers['accept-encoding'].join(', ')
              : config.headers['accept-encoding']
          }`,
        }),
      });
      interceptedRequest.continue({headers});
    };

    try {
      const browser = await puppeteer.launch();

      try {
        const page = await browser.newPage();
        if (config?.timeout) {
          page.setDefaultNavigationTimeout(config.timeout);
        }
        if (config?.mobileDevice) {
          await page.emulate(KnownDevices[config.mobileDevice as Device]);
        }
        if (config?.switchOffJavaScript) {
          await page.setJavaScriptEnabled(false);
        }

        await page.setRequestInterception(true);
        page.on('request', requestHandler);

        const initialResources = await loadPageResources(page, url, {
          reload: false,
          cacheEnabled: false,
          scrollToBottom: config?.scrollToBottom,
        });

        const reloadedResources = await loadPageResources(page, url, {
          reload: true,
          cacheEnabled: true,
          scrollToBottom: config?.scrollToBottom,
        });

        return computeMetrics(
          initialResources,
          reloadedResources,
          computeReloadRatio
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

  const loadPageResources = async (
    page: Page,
    url: string,
    {reload, cacheEnabled, scrollToBottom}: MeasurePageOptions
  ) => {
    const pageResources: Resource[] = [];

    const responseHandler = async (response: HTTPResponse) => {
      try {
        // TODO attempt to handle errors of possible preflight requests
        // example www.tagesschau.de
        // ProtocolError: Could not load body for this request. This might happen if the request is a preflight request.
        if (
          response.status() !== 204 &&
          response.status() !== 304 &&
          response.request().method() !== 'OPTIONS'
        ) {
          const resource: Resource = {
            url: response.url(),
            size: (await response.buffer()).length,
            fromCache: response.fromCache(),
            fromServiceWorker: response.fromServiceWorker(),
            type: response.request().resourceType(),
          };
          pageResources.push(resource);
        }
      } catch (error) {
        console.error(
          `MeasureWebpage: Error accessing response body: ${error}`
        );
      }
    };

    try {
      await page.setCacheEnabled(cacheEnabled);

      page.on('response', responseHandler);

      if (!reload) {
        await page.goto(url, {waitUntil: 'networkidle0'});
      } else {
        await page.reload({waitUntil: 'networkidle0'});
      }

      page.off('response', responseHandler);

      if (scrollToBottom) {
        // await page.screenshot({path: './TOP.png'});
        await page.evaluate(scrollThroughPage);
        // await page.screenshot({path: './BOTTOM.png'});
      }

      return pageResources;
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during measurement of webpage: ${error}`,
        })
      );
    }
  };

  const scrollThroughPage = async () => {
    await new Promise<void>(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  };

  const computeMetrics = (
    initialResources: Resource[],
    reloadResources: Resource[],
    computeReloadRatio: boolean
  ) => {
    const resourceTypeWeights = initialResources.reduce(
      (acc, resource) => {
        if (resource.type in acc) {
          acc[resource.type] += resource.size;
        } else {
          acc[resource.type] = resource.size;
        }
        return acc;
      },
      {} as Record<ResourceType, number>
    );
    const initialPageWeight = Object.values(resourceTypeWeights).reduce(
      (acc, resourceTypeSize) => acc + resourceTypeSize,
      0
    );

    let dataReloadRatio: number | undefined;
    if (computeReloadRatio) {
      const initialCacheWeight = initialResources.reduce(
        (acc, resource) => acc + (resource.fromCache ? resource.size : 0),
        0
      );
      if (initialCacheWeight > 0) {
        console.warn('Initial page load contained resources from cache.');
      }
      const reloadPageWeight = reloadResources.reduce(
        (acc, resource) => acc + resource.size,
        0
      );

      const assumeFromCache = initialPageWeight - reloadPageWeight;
      const browserCache = reloadResources.reduce(
        (acc, resource) => acc + (resource.fromCache ? resource.size : 0),
        0
      );
      const assumedCacheWeight = assumeFromCache + browserCache;

      dataReloadRatio =
        (initialPageWeight - assumedCacheWeight) / initialPageWeight;
    }

    return {
      pageWeight: initialPageWeight,
      resourceTypeWeights,
      dataReloadRatio,
    };
  };

  /**
   * Validates the input parameters of the puppeteer model.
   */
  const validateSingleInput = (input: PluginParams) => {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  };

  const ALLOWED_ENCODINGS = [
    'gzip',
    'compress',
    'deflate',
    'br',
    'zstd',
    'identity',
    '*',
  ] as const;
  const configSchema = z
    .object({
      timeout: z.number().gte(0).optional(),
      mobileDevice: z.string().optional(),
      scrollToBottom: z.boolean().optional(),
      switchOffJavaScript: z.boolean().optional(),
      headers: z
        .object({
          accept: z.string().optional(),
          'accept-encoding': z
            .array(z.enum(ALLOWED_ENCODINGS))
            .or(z.string(z.enum(ALLOWED_ENCODINGS)))
            .optional(),
        })
        .optional(),
      options: z
        .object({
          dataReloadRatio: z.number().optional(),
        })
        .optional(),
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

  /**
   * Validates Global config parameters.
   */
  const validateGlobalConfig = () => {
    return validate<z.infer<typeof configSchema>>(
      configSchema,
      globalConfig || {}
    );
  };

  return {
    metadata,
    execute,
  };
};
