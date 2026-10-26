const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
	start() {
		console.log("Starting node helper for: " + this.name);
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "F1RADIO_REQUEST") return;

		const file = payload && payload.file ? payload.file : "radios.json";
		const fullPath = path.isAbsolute(file) ? file : path.join(__dirname, file);

		fs.readFile(fullPath, "utf8", (err, data) => {
			if (err) {
				this.sendSocketNotification("F1RADIO_ERROR", "Unable to read " + file + ": " + err.message);
				return;
			}
			try {
				const parsed = JSON.parse(data);
				const list = (Array.isArray(parsed) ? parsed : []).filter(
					(r) => r && typeof r.text === "string" && r.text.trim() !== ""
				);
				this.sendSocketNotification("F1RADIO_LIST", list);
			} catch (e) {
				this.sendSocketNotification("F1RADIO_ERROR", "Invalid JSON in " + file + ": " + e.message);
			}
		});
	}
});
