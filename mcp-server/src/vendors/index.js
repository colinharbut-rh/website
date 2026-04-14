/**
 * Vendor registry — maps vendor IDs to their scraping configs.
 * To add a new vendor: create src/vendors/<id>.js and add it here.
 */

import { whatagraphConfig } from './whatagraph.js';
import { databoxConfig } from './databox.js';
import { supermetricsConfig } from './supermetrics.js';
import { windsorConfig } from './windsor.js';
import { lookerConfig } from './looker.js';
import { catchrConfig } from './catchr.js';
import { portermetricsConfig } from './portermetrics.js';
import { agencyanalyticsConfig } from './agencyanalytics.js';
import { bymarketersConfig } from './bymarketers.js';

export const vendors = {
  whatagraph: whatagraphConfig,
  databox: databoxConfig,
  supermetrics: supermetricsConfig,
  windsor: windsorConfig,
  looker: lookerConfig,
  catchr: catchrConfig,
  portermetrics: portermetricsConfig,
  agencyanalytics: agencyanalyticsConfig,
  bymarketers: bymarketersConfig,
};
