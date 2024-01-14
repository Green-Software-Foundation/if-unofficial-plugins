import {ModelPluginInterface} from '../../interfaces';
import {ModelParams} from '../../types';

import * as path from 'path';
import * as fs from 'fs/promises';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';
const {IOError, InputValidationError} = ERRORS;

export class CsvExportModel implements ModelPluginInterface {
  private outputPath: string | undefined;

  private errorBuilder = buildErrorMessage(CsvExportModel);

  private headers: string[] = [];

  async configure(params: object | undefined): Promise<ModelPluginInterface> {
    if (params === undefined) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Configuration data is missing'})
      );
    }

    if ('output-path' in params) {
      this.outputPath = params['output-path'] as string;
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'output-path required'})
      );
    }

    if ('headers' in params) {
      this.headers = params['headers'] as string[];
    }

    return this;
  }

  async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    if (this.outputPath) {
      const dirPath = path.dirname(this.outputPath);

      try {
        await fs.mkdir(dirPath, {recursive: true});
      } catch (error) {
        throw new IOError(
          this.errorBuilder({
            message: 'Failed to create directory for CSV at path: ' + dirPath,
          })
        );
      }

      if (
        this.headers.length === 0 &&
        Array.isArray(inputs) &&
        inputs.length > 0
      ) {
        this.headers = Object.keys(inputs[0]);
      }

      const contents = [
        this.headers.join(','),
        ...inputs.map(row =>
          this.headers.map(fieldName => row[fieldName]).join(',')
        ),
      ].join('\r\n');

      try {
        await fs.writeFile(this.outputPath, contents);
      } catch (error) {
        throw new IOError(
          this.errorBuilder({
            message: 'Failed to write CSV to ' + this.outputPath,
          })
        );
      }
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'Model not configured correctly'})
      );
    }
    return inputs;
  }
}
