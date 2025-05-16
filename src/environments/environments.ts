import * as dotenv from 'dotenv';

dotenv.config();

export const environment = {
  production: false,
  maptileApiKey: process.env['MAPTILE_API_KEY'] || '',
};
