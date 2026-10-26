# MMM-F1TeamRadio

A [MagicMirror²](https://magicmirror.builders/) module that shows a randomly picked, historic F1 team radio message in the position of your choice. The message changes every few minutes.

## Installation

1. Clone the repository into your MagicMirror modules folder (no `npm install` needed, the module has no dependencies):

```bash
cd ~/MagicMirror/modules
git clone https://github.com/rock14r/MMM-F1TeamRadio.git
```

To update later, run `git pull` inside the `MMM-F1TeamRadio` folder.

2. Add the module to `config/config.js`:

```js
{
	module: "MMM-F1TeamRadio",
	position: "bottom_left", // any MagicMirror position
	config: {
		intervalMinutes: 10,
		showMeta: true
	}
},
```

3. Restart MagicMirror (`pm2 restart mm` or `npm start`).

## Options

| Option | Default | Description |
|---|---|---|
| `header` | `"F1 Team Radio"` | Title above the message (`""` to hide it) |
| `intervalMinutes` | `5` | How often the message changes, in minutes |
| `fadeSpeed` | `1500` | Fade animation duration (ms) |
| `file` | `"radios.json"` | List file (relative to the module folder, or an absolute path) |
| `avoidRepeat` | `true` | Never show the same message twice in a row |
| `showMeta` | `true` | Show driver, team, GP and year |
| `showIcon` | `true` | Show the headset icon next to the title |

## Dynamic list

The list lives in `radios.json`. The file is re-read every time the message changes, so you can add or remove entries **without restarting** the mirror.

```json
{
	"text": "GP2 engine! GP2! Aaaaah!",
	"speaker": "Fernando Alonso",
	"team": "McLaren",
	"gp": "Japanese GP",
	"year": 2015,
	"check": { "driverId": "alonso", "constructorId": "mclaren", "circuitId": "suzuka" }
}
```

- `text` is required; `speaker`, `team`, `gp` and `year` are for display only.
- `check` holds the identifiers used by the verification script (see below). If the same circuit hosted two races in one year (e.g. Silverstone 2020), add `"round": 4`.

## Verifying the list

`verify-radios.js` checks the entries against historical data from [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (Ergast-compatible API). Nothing to install, Node 18+ is enough:

```bash
cd ~/MagicMirror/modules/MMM-F1TeamRadio
node verify-radios.js
```

For each entry it checks that the race exists, that the driver took part in it and that they drove for the given team, and it prints the finishing position and status for a quick eyeball check. Example output:

```
✔ #1 "GP2 engine! GP2! Aaaaah!"
    Japanese Grand Prix 2015 (round 16) · Fernando Alonso · McLaren · P11 (...)
```

The identifiers (`driverId`, `constructorId`, `circuitId`) are the Ergast/Jolpica ones, for example `raikkonen`, `red_bull`, `yas_marina`. With `--strict`, warnings (such as a duplicated message) also fail the check. Jolpica rate-limits requests (about 500 per hour), which is not a problem for normal lists.

**What it does not verify:** the script confirms the *context* (who, where, when, with which team), not that the message was actually said. Check the wording yourself against a video or article before adding an entry.

## Disclaimer

This is an unofficial project and is not affiliated with Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V.

## License

[MIT](LICENSE)
