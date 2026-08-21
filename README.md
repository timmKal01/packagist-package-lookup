# Packagist (PHP/Composer) Package Lookup

Look up the latest stable version, total/monthly/daily downloads,
GitHub stats, and runtime dependencies for any PHP Composer package,
via the official [Packagist API](https://packagist.org/apidoc).

Built for DevOps and PHP tooling teams tracking dependency health and
adoption without checking packagist.org by hand.

## Input

```json
{
  "packageNames": ["laravel/framework", "symfony/console"]
}
```

| Field | Type | Description |
|---|---|---|
| `packageNames` | array of strings | One or more Composer package names in `"vendor/package"` form. Default `["laravel/framework"]`. |

## Output

One record per requested package:

```json
{
  "packageName": "laravel/framework",
  "found": true,
  "description": "The Laravel Framework.",
  "totalDownloads": 565601144,
  "monthlyDownloads": 13469719,
  "dailyDownloads": 611954,
  "githubStars": 34875,
  "githubForks": 11953,
  "githubOpenIssues": 97,
  "dependentsCount": 20820,
  "latestStableVersion": "v13.26.1",
  "latestVersionReleasedAt": "2026-08-18T20:32:11+00:00",
  "latestVersionLicense": ["MIT"],
  "homepageUrl": "https://laravel.com",
  "runtimeRequire": [
    { "name": "php", "requirement": "^8.3" }
  ]
}
```

An unrecognized package name returns
`{ "packageName": "...", "found": false }` rather than failing the
whole run. "Latest stable version" excludes dev branches (e.g.
`dev-master`, `13.x-dev`) — Packagist's own version-ordering metadata
treats dev branches as sorting *above* every tagged release, which
would otherwise silently report a branch name instead of a real
version.

## How it works

Direct calls to the official `packagist.org/packages` endpoint — no
proxy, no key, no scraping.

## Pricing note

Billed per **lookup** (one run) at a flat rate, regardless of how many
package names are requested.

## Related products

- [NPM Download Stats Tracker](https://github.com/timmKal01/npm-download-stats-tracker)
- [RubyGems Package Lookup](https://github.com/timmKal01/rubygems-package-lookup) — same snapshot-lookup shape, different ecosystem
- [Homebrew Package Lookup](https://github.com/timmKal01/homebrew-package-lookup)
