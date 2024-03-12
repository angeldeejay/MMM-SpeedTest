/* MagicMirror²
 * Module: MMM-SpeedTest
 * MIT Licensed.
 */
Module.register("MMM-SpeedTest", {
  name: "MMM-SpeedTest",
  logPrefix: null,
  messagePrefix: null,
  connectionData: null,

  start() {
    this.logPrefix = `${this.name} ::`;
    this.messagePrefix = `${this.name}-`;
    this.resetData();
    this.log("Started");
    this._sendNotification("GET_DATA", {});
    this.updateDom();
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

  getTemplate() {
    return this.name + ".njk";
  },

  getTemplateData() {
    if (!this.connectionData) this.resetData();
    return {
      ...this.connectionData,
      DOWNLOAD_SPEED_LABEL: this.translate("DOWNLOAD_SPEED_LABEL"),
      UPLOAD_SPEED_LABEL: this.translate("UPLOAD_SPEED_LABEL"),
      ISP_LABEL: this.translate("ISP_LABEL"),
      CLIENT_LABEL: this.translate("CLIENT_LABEL"),
      PING_LABEL: this.translate("PING_LABEL"),
      JITTER_LABEL: this.translate("JITTER_LABEL"),
      SERVER_LABEL: this.translate("SERVER_LABEL")
    };
  },

  resume() {
    this.info("resuming module");
    this.debug("with config: " + JSON.stringify(this.config, null, 2));
    this.suspended = false;
    this.updateDom();
  },

  suspend() {
    this.info("suspending module");
    this.suspended = true;
  },

  _sendNotification(notification, payload) {
    this.sendSocketNotification(
      `${this.messagePrefix}${notification}`,
      payload
    );
  },

  _notificationReceived(notification, payload) {
    switch (notification) {
      case "DATA":
        this.connectionData = payload;
        this.updateDom();
        break;
      default:
    }
  },

  socketNotificationReceived(notification, payload) {
    this._notificationReceived(
      notification.replace(new RegExp(`^${this.messagePrefix}`, "gi"), ""),
      payload
    );
  },

  // Load stylesheets
  getStyles() {
    return [
      this.file("node_modules/@fortawesome/fontawesome-free/css/all.min.css"),
      this.file(`${this.name}.css`)
    ];
  },

  // Load translations files
  getTranslations() {
    return {
      en: "translations/en.json",
      es: "translations/es.json"
    };
  }
});
