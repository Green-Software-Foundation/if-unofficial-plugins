import * as dotenv from 'dotenv';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {ModelParams} from '../../types/common';
import {ModelPluginInterface} from '../../interfaces';

const {AuthorizationError} = ERRORS;


const BASE_URL = 'https://api.electricitymap.org/v3';

export class ElectricityMapsModel implements ModelPluginInterface {
    authorizationHeader: string = '';
    errorBuilder = buildErrorMessage(ElectricityMapsModel);
    async configure(): Promise<ModelPluginInterface> {
        this.initAuth();
        return this;
    }
    async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
        const outputs: ModelParams[] = [];
        return outputs;
    }
    initAuth() {
        dotenv.config();
        const token = process.env.EMAPS_TOKEN;
        if (!token) {
            throw new AuthorizationError(
                this.errorBuilder({
                    message: 'Missing token',
                    scope: 'authorization',
                })
            );
        }
        this.authorizationHeader = `auth-token: ${token}`;
    }
}