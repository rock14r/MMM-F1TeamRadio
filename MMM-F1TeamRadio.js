/* MagicMirror² Module: MMM-F1TeamRadio
 * Shows a randomly picked, historic F1 team radio message and rotates it periodically.
 */
Module.register("MMM-F1TeamRadio", {
	defaults: {
		header: "F1 Team Radio",
		intervalMinutes: 5, // how often the message changes
		fadeSpeed: 1500, // fade animation duration (ms)
		file: "radios.json", // list file (relative to the module folder, or an absolute path)
		avoidRepeat: true, // avoid showing the same message twice in a row
		showMeta: true, // show driver/team/GP/year
		showIcon: true // show the radio icon next to the header
	},

	getStyles() {
		return ["MMM-F1TeamRadio.css", "font-awesome.css"];
	},

	start() {
		Log.info("Starting module: " + this.name);
		this.list = [];
		this.current = null;
		this.lastIndex = -1;
		this.loaded = false;
		this.requestList();
		this.timer = setInterval(() => this.requestList(), Math.max(1, this.config.intervalMinutes) * 60 * 1000);
	},

	// The file is re-read on every change: you can edit radios.json without restarting the mirror.
	requestList() {
		this.sendSocketNotification("F1RADIO_REQUEST", { file: this.config.file });
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "F1RADIO_LIST") {
			this.error = null;
			this.list = payload;
			this.loaded = true;
			this.pickRandom();
			this.updateDom(this.config.fadeSpeed);
		} else if (notification === "F1RADIO_ERROR") {
			Log.error(this.name + ": " + payload);
			this.error = payload;
			this.updateDom(this.config.fadeSpeed);
		}
	},

	pickRandom() {
		if (!this.list.length) {
			this.current = null;
			return;
		}
		let idx = Math.floor(Math.random() * this.list.length);
		if (this.config.avoidRepeat && this.list.length > 1) {
			while (idx === this.lastIndex) {
				idx = Math.floor(Math.random() * this.list.length);
			}
		}
		this.lastIndex = idx;
		this.current = this.list[idx];
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "f1radio";

		if (this.error) {
			wrapper.className += " dimmed light small";
			wrapper.textContent = this.error;
			return wrapper;
		}
		if (!this.loaded) {
			wrapper.className += " dimmed light small";
			wrapper.textContent = this.translate("LOADING");
			return wrapper;
		}
		if (!this.current) {
			wrapper.className += " dimmed light small";
			wrapper.textContent = "No team radio available.";
			return wrapper;
		}

		const r = this.current;

		if (this.config.header) {
			const h = document.createElement("div");
			h.className = "f1radio-header xsmall dimmed";
			if (this.config.showIcon) {
				h.innerHTML = '<i class="fa fa-headset"></i> ';
			}
			h.appendChild(document.createTextNode(this.config.header));
			wrapper.appendChild(h);
		}

		const quote = document.createElement("div");
		quote.className = "f1radio-text bright medium light";
		quote.textContent = "“" + r.text + "”";
		wrapper.appendChild(quote);

		if (this.config.showMeta) {
			const parts = [];
			if (r.speaker) parts.push(r.speaker);
			if (r.team) parts.push(r.team);
			const where = [r.gp, r.year].filter(Boolean).join(" ");
			if (where) parts.push(where);
			if (parts.length) {
				const meta = document.createElement("div");
				meta.className = "f1radio-meta xsmall dimmed";
				meta.textContent = "— " + parts.join(" · ");
				wrapper.appendChild(meta);
			}
		}

		return wrapper;
	}
});
