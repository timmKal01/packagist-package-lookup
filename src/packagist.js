import { log } from 'apify';

const BASE_URL = 'https://packagist.org/packages';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** Compares two Composer "version_normalized" strings numerically, segment by segment. */
function compareVersions(a, b) {
    const parse = (v) => v.replace(/^v/, '').split(/[.\-+]/).map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p));
    const pa = parse(a);
    const pb = parse(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const x = pa[i];
        const y = pb[i];
        if (x === undefined) return -1;
        if (y === undefined) return 1;
        if (x === y) continue;
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        return String(x).localeCompare(String(y));
    }
    return 0;
}

/** Picks the highest real tagged release, excluding dev branches (Composer marks these with a
 *  huge 9999999 sentinel in version_normalized specifically so they'd sort as "highest" of all,
 *  which is the opposite of what a "latest stable version" lookup should report). */
function findLatestStableVersion(versions) {
    const candidates = Object.entries(versions ?? {}).filter(([key, v]) => {
        if (/^dev-/.test(key)) return false;
        if (/-dev$/.test(key)) return false;
        if (/9999999/.test(v?.version_normalized ?? '')) return false;
        return true;
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => compareVersions(b[1].version_normalized, a[1].version_normalized));
    return candidates[0][1];
}

async function fetchPackage(name) {
    const url = `${BASE_URL}/${name}.json`;

    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            const body = await res.json().catch(() => null);

            if (res.status === 404) return { found: false };
            if (res.ok && body?.package && typeof body.package === 'object') return { found: true, data: body.package };

            const retryable = res.status === 429 || res.status >= 500 || body === null;
            lastErr = new Error(`Packagist API request failed for "${name}": ${res.status} ${res.statusText}`);
            if (!retryable) throw lastErr;
        } catch (err) {
            lastErr = err.name === 'AbortError'
                ? new Error(`Packagist API request timed out for "${name}" (attempt ${attempt}/${MAX_ATTEMPTS})`)
                : err;
        }
        if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            log.warning(`Retrying Packagist request for "${name}" in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastErr.message}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

export async function fetchPackages(packageNames) {
    const results = [];
    for (const name of packageNames) {
        try {
            const outcome = await fetchPackage(name);
            if (!outcome.found) {
                results.push({ packageName: name, found: false });
                continue;
            }
            const p = outcome.data;
            const latest = findLatestStableVersion(p.versions);

            results.push({
                packageName: p.name ?? name,
                found: true,
                description: p.description ?? null,
                totalDownloads: p.downloads?.total ?? null,
                monthlyDownloads: p.downloads?.monthly ?? null,
                dailyDownloads: p.downloads?.daily ?? null,
                githubStars: p.github_stars ?? null,
                githubForks: p.github_forks ?? null,
                githubOpenIssues: p.github_open_issues ?? null,
                dependentsCount: p.dependents ?? null,
                latestStableVersion: latest?.version ?? null,
                latestVersionReleasedAt: latest?.['published-time'] ?? latest?.time ?? null,
                latestVersionLicense: Array.isArray(latest?.license) ? latest.license : null,
                homepageUrl: latest?.homepage ?? null,
                runtimeRequire: latest?.require && typeof latest.require === 'object'
                    ? Object.entries(latest.require).map(([depName, requirement]) => ({ name: depName, requirement }))
                    : [],
            });
        } catch (err) {
            log.warning(`Skipping "${name}" after repeated failures: ${err.message}`);
            results.push({ packageName: name, found: false, error: err.message });
        }
    }
    return results;
}
