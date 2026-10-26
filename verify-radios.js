#!/usr/bin/env node
/*
 * Verifies radios.json against historical data from Jolpica-F1 (Ergast-compatible API).
 *
 * For each entry it checks that:
 *   - the race exists (year + circuit, optionally round),
 *   - the given driver actually took part in that race,
 *   - the driver drove for the given team in that race.
 *
 * NOTE: the script verifies the CONTEXT (who, where, when, with which team),
 * NOT the wording of the message. For that you need a source: fill in the "source" field.
 *
 * Usage:
 *   node verify-radios.js                 # checks ./radios.json
 *   node verify-radios.js other.json      # checks another file
 *   node verify-radios.js --strict        # warnings (e.g. missing "source") also fail the check
 *
 * Exit codes: 0 = all good, 1 = inconsistencies found, 2 = API unreachable.
 * Requires Node 18+ (built-in fetch). No external dependencies.
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://api.jolpi.ca/ergast/f1";
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const fileArg = args.find((a) => !a.startsWith("--"));
const file = path.resolve(fileArg || path.join(__dirname, "radios.json"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();

class NetworkError extends Error {}

// Jolpica rate-limits requests (burst and hourly): short pause + retry on 429.
async function getJson(url, attempt = 0) {
	if (cache.has(url)) return cache.get(url);
	let res;
	try {
		res = await fetch(url, { headers: { Accept: "application/json" } });
	} catch (e) {
		throw new NetworkError(`Unable to reach ${url}: ${e.message}`);
	}
	if (res.status === 429 && attempt < 4) {
		await sleep(2000 * (attempt + 1));
		return getJson(url, attempt + 1);
	}
	if (!res.ok) throw new NetworkError(`HTTP ${res.status} from ${url}`);
	const json = await res.json();
	cache.set(url, json);
	await sleep(350);
	return json;
}

async function checkEntry(entry) {
	const problems = [];
	const warnings = [];
	let info = "";

	if (!entry.source) {
		warnings.push('missing "source" (link to a video/article that reports the message)');
	}

	const c = entry.check || {};
	if (!entry.year || !c.driverId || !c.circuitId) {
		problems.push('"year" and "check": { "driverId", "circuitId" } are required (and "constructorId" is recommended)');
		return { problems, warnings, info };
	}

	const url = `${BASE}/${entry.year}/circuits/${encodeURIComponent(c.circuitId)}/results.json?limit=100`;
	const data = await getJson(url);
	let races = (data && data.MRData && data.MRData.RaceTable && data.MRData.RaceTable.Races) || [];

	if (c.round) races = races.filter((r) => Number(r.round) === Number(c.round));

	if (races.length === 0) {
		problems.push(`no race found at "${c.circuitId}" in ${entry.year}${c.round ? " (round " + c.round + ")" : ""}`);
		return { problems, warnings, info };
	}
	if (races.length > 1) {
		problems.push(`multiple races at "${c.circuitId}" in ${entry.year}: add "check.round" to pick one`);
		return { problems, warnings, info };
	}

	const race = races[0];
	const row = (race.Results || []).find((r) => r.Driver.driverId === c.driverId);
	if (!row) {
		problems.push(`"${c.driverId}" is not among the participants of ${race.raceName} ${race.season}`);
		return { problems, warnings, info };
	}

	if (c.constructorId && row.Constructor.constructorId !== c.constructorId) {
		problems.push(
			`${row.Driver.familyName} drove for "${row.Constructor.constructorId}" in ${race.season}, not "${c.constructorId}"`
		);
	}

	info = `${race.raceName} ${race.season} (round ${race.round}) · ${row.Driver.givenName} ${row.Driver.familyName} · ${row.Constructor.name} · P${row.position} (${row.status})`;
	return { problems, warnings, info };
}

(async () => {
	let list;
	try {
		list = JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (e) {
		console.error(`Unable to read ${file}: ${e.message}`);
		process.exit(1);
	}
	if (!Array.isArray(list)) {
		console.error("The file must contain a JSON array.");
		process.exit(1);
	}

	let failed = 0;
	let warned = 0;
	const seen = new Map();

	for (let i = 0; i < list.length; i++) {
		const entry = list[i];
		const label = `#${i + 1} "${String(entry.text || "").slice(0, 45)}"`;

		// duplicates
		const key = String(entry.text || "").toLowerCase().replace(/\s+/g, " ").trim();
		const dupWarn = [];
		if (seen.has(key)) dupWarn.push(`duplicate text of entry #${seen.get(key) + 1}`);
		else seen.set(key, i);

		try {
			const { problems, warnings, info } = await checkEntry(entry);
			warnings.push(...dupWarn);
			const status = problems.length ? "✖" : warnings.length ? "⚠" : "✔";
			console.log(`${status} ${label}`);
			if (info) console.log(`    ${info}`);
			problems.forEach((p) => console.log(`    ERROR: ${p}`));
			warnings.forEach((w) => console.log(`    warning: ${w}`));
			if (problems.length) failed++;
			else if (warnings.length) warned++;
		} catch (e) {
			if (e instanceof NetworkError) {
				console.error(`\nJolpica API unreachable: ${e.message}`);
				process.exit(2);
			}
			throw e;
		}
	}

	console.log(`\n${list.length} entries: ${list.length - failed - warned} ok, ${warned} with warnings, ${failed} with errors.`);
	console.log("Note: only the context (race, driver, team) is verified, not the wording of the message.");
	process.exit(failed || (strict && warned) ? 1 : 0);
})();
