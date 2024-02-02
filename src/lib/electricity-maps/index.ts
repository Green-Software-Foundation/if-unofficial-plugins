/* eslint-disable prettier/prettier */
import * as dotenv from 'dotenv';
import axios from 'axios';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {KeyValuePair, ModelParams} from '../../types/common';
import {ModelPluginInterface} from '../../interfaces';


const {AuthorizationError, APIRequestError} = ERRORS;

const BASE_URL = 'https://api.electricitymap.org/v3';

export class ElectricityMapsModel implements ModelPluginInterface {
    authorizationHeader = '';
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
    private async get_carbon_intensity(zone_key?: string, latitude?: number, longitude?: number): Promise<KeyValuePair> {
        // TODO handle parameters
        const url = `${BASE_URL}/carbon-intensity/latest`;
        const response = await axios.get(
            url,
            {
                headers: {
                    'auth-token': this.authorizationHeader,
                },
            }
        )
        if (response.status !== 200) {
            throw new APIRequestError(
                this.errorBuilder({
                  message: `Error fetching data from WattTime API: ${JSON.stringify(
                    response.status
                  )}`,
                })
              );
        }
        const data = response.data;
        return {
            key: 'carbon_intensity',
            value: data.carbonIntensity,
        };
    }
}
