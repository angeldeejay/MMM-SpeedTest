/* MagicMirror²
 * Module: MMM-SpeedTest
 * MIT Licensed.
 */
const Log = require("logger");
const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const download = require("download");
const decompress = require("decompress");
const decompressTargz = require("decompress-targz");
const {
  InternetAvailabilityService,
  isInternetAvailable
} = require("is-internet-available");
const { execSync, exec } = require("child_process");
const MODULE_NAME = path.basename(__dirname);
const DOWNLOAD_URL =
  "https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-linux-x86_64.tgz";

module.exports = NodeHelper.create({
  name: MODULE_NAME,
  logPrefix: MODULE_NAME + " :: ",
  messagePrefix: MODULE_NAME + "-",
  connectionData: undefined,
  service: undefined,
  connected: false,

  start() {
    this.resetData();
    this.log("Started");

    this.service = new InternetAvailabilityService({ rate: 2000 });
    this.service.on(
      "status",
      (status) => (this.connected = status ? true : false)
    );
    this.ensureBinary();
  },

  // Logging wrapper
  log(msg, ...args) {
    Log.log(`${this.logPrefix}${msg}`, ...args);
  },
  info(msg, ...args) {
    Log.info(`${this.logPrefix}${msg}`, ...args);
  },
  debug(msg, ...args) {
    Log.debug(`${this.logPrefix}${msg}`, ...args);
  },
  error(msg, ...args) {
    Log.error(`${this.logPrefix}${msg}`, ...args);
  },
  warning(msg, ...args) {
    Log.warn(`${this.logPrefix}${msg}`, ...args);
  },

  resetData() {
    this.connectionData = {
      connected: false,
      client: "-",
      ping: "-",
      jitter: "-",
      downloadSpeed: "-",
      uploadSpeed: "-",
      isp: "-",
      server: "-"
    };
  },

  async ensureBinary() {
    const binDir = path.join(__dirname, "binaries");
    fs.mkdirSync(binDir, { recursive: true });
    const binPath = path.join(binDir, "speedtest");
    if (!fs.existsSync(binPath)) {
      try {
        this.log("Binary not found. downloading");
        const pkgPath = path.join(__dirname, path.basename(DOWNLOAD_URL));
        if (fs.existsSync(pkgPath)) {
          fs.unlinkSync(pkgPath);
        }
        await download(DOWNLOAD_URL).pipe(fs.createWriteStream(pkgPath));
        this.log("Binary downloaded. extracting");
        await decompress(pkgPath, binDir, {
          plugins: [decompressTargz()],
          filter: (file) => /(^|\/)speedtest(.exe)?$/.test(file.path)
        });
        fs.chmodSync(binPath, 0o755);
        if (fs.existsSync(pkgPath)) {
          fs.unlinkSync(pkgPath);
        }
        this.log("Binary ready");
        this.loop();
      } catch (err) {
        console.error(err);
        setTimeout(() => this.ensureBinary(), 100);
      }
    } else {
      this.loop();
    }
  },

  setResults(cmndResult) {
    const results = JSON.parse(cmndResult);
    this.connectionData = {
      connected: true,
      client: results.interface.externalIp,
      ping: results.ping.latency.toFixed(2),
      jitter: results.ping.jitter.toFixed(2),
      downloadSpeed: parseInt(
        (results.download.bytes / (1024 * 1024)).toFixed(0)
      ),
      uploadSpeed: parseInt((results.upload.bytes / (1024 * 1024)).toFixed(0)),
      isp: results.isp,
      server: results.server.name
    };
  },

  loop() {
    const getData = (resolve, reject) => {
      if (!this.connected) {
        reject(new Error("offline"));
        return;
      }
      isInternetAvailable()
        .then(() => {
          const binPath = path.join(__dirname, "binaries", "speedtest");
          this.log("Checking internet connection");
          exec(
            [binPath, "-f", "json", "-p", "no", "--accept-license"].join(" "),
            { cwd: __dirname, encoding: "utf-8", stdio: "pipe" },
            (err, stdout, ..._) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(stdout);
            }
          );
        })
        .catch((err) => {
          this.resetData();
          reject(err);
        });
    };

    let delay;
    new Promise(getData)
      .then((stdout) => {
        this.setResults(stdout);
        delay = 5 * 60 * 1000;
      })
      .catch((err) => {
        if (err.message && err.message !== "offline") console.error(err);
        delay = 500;
      })
      .finally(() => {
        this._sendNotification("DATA", this.connectionData);
        setTimeout(() => this.ensureBinary(), delay);
      });
  },

  _sendNotification(notification, payload) {
    this.sendSocketNotification(
      `${this.messagePrefix}${notification}`,
      payload
    );
  },

  _notificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DATA":
        this._sendNotification("DATA", this.connectionData);
        break;
      default:
    }
  },

  socketNotificationReceived(notification, payload) {
    this._notificationReceived(
      notification.replace(new RegExp(`^${this.messagePrefix}`, "gi"), ""),
      payload
    );
  }
});
