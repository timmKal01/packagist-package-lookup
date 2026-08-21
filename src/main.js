import { Actor, log } from 'apify';
import { fetchPackages } from './packagist.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { packageNames = ['laravel/framework'] } = input;

if (!Array.isArray(packageNames) || packageNames.length === 0) {
    throw new Error('Input "packageNames" must be a non-empty array, e.g. ["laravel/framework"].');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const PACKAGE_LOOKUP_EVENT = 'package-lookup';

const results = await fetchPackages(packageNames);

for (const result of results) {
    await Actor.pushData(result);
}

await Actor.charge({ eventName: PACKAGE_LOOKUP_EVENT });

log.info(`Pushed ${results.length} package(s)`);

await Actor.exit();
