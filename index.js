// homebridge-sma-battery Erweiterung:
// - Nur Batterie-Service (SoC)
// - FakeGato-History-Service für Batterie
// - Feature-simplifiziert auf Ladezustand

const inherits = require("util").inherits;
const ModbusRTU = require("modbus-serial");
const dns = require("dns");
let Service, Characteristic, Accessory, FakeGatoHistoryService;
const client = new ModbusRTU();

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    FakeGatoHistoryService = require('fakegato-history')(homebridge);
    // Neuer Plugin-Name und Accessory
    homebridge.registerAccessory("homebridge-sma-battery", "SMABattery", SMABattery);
};

function SMABattery(log, config) {
    this.log = log;
    this.name = config.name;
    this.hostname = config.hostname;
    this.refreshInterval = (config.refreshInterval || 15) * 1000;
    this.debug = config.debug;
    this.unitId = config.unitId || 3; // Battery UnitID
    this.connected = false;

    // Accessory information
    this.value = {
        Name: this.name,
        Manufacturer: 'SMA',
        Model: 'BatteryInverter',
        FirmwareRevision: '1.0.0',
        SerialNumber: 'SMAB-' + this.unitId
    };

    defineCustomCharacteristics();
    this._isValid = function(val, min, max) {
        return typeof val === 'number' && !isNaN(val) && isFinite(val) && val >= min && val <= max;
    };

    this._connect();
    this._refresh();
    setInterval(this._refresh.bind(this), this.refreshInterval);
}

function defineCustomCharacteristics() {
    // Keine zusätzlichen Custom Characteristics nötig für Battery
}

SMABattery.prototype._connect = function() {
    dns.resolve4(this.hostname, (err, addr) => {
        const target = (!err && addr.length) ? addr[0] : this.hostname;
        client.connectTCP(target, { port: 502 }, err2 => {
            if (err2) {
                this.log(`Connection failed: ${err2.message}`);
                this.connected = false;
            } else {
                client.setID(this.unitId);
                this.connected = true;
                this.log(`Connected to ${target} UnitID ${this.unitId}`);
            }
        });
    });
};

SMABattery.prototype._refresh = function() {
    this.log(`[${this.name}] 🔄 Refresh Battery at ${new Date().toISOString()}`);
    if (!this.connected) {
        this.log(`[${this.name}] Not connected - skipping battery refresh`);
        return;
    }
    // Lese Batterieladestand (SoC)
    client.readHoldingRegisters(30845, 2, (err, data) => {
        if (err) {
            this.log(`[${this.name}] Error reading Battery SoC: ${err.message}`);
            return;
        }
        const raw = data.buffer.readUInt32BE();
        const val = raw;
        this.log(`[${this.name}] Battery SoC: raw=${raw}, val=${val}`);
        if (this._isValid(val, 0, 100)) {
            this.batteryService.getCharacteristic(Characteristic.BatteryLevel).updateValue(val);
            this.batteryService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(val < 20 ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
            this.batteryService.getCharacteristic(Characteristic.ChargingState).updateValue(Characteristic.ChargingState.NOT_CHARGING);
            this.loggingService.addEntry({ time: Math.floor(Date.now()/1000), power: val });
        }
    });
};

SMABattery.prototype.identify = function(callback) {
    this.log(`Identify requested for ${this.name}`);
    callback();
};

SMABattery.prototype.getServices = function() {
    const services = [];
    // Add LightSensor to display Battery SoC as percentage in Eve
    this.batterySensor = new Service.LightSensor(this.name + ' SoC Sensor', 'battery-sensor');
    this.batterySensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .setProps({ unit: '%', minValue: 0, maxValue: 100, minStep: 1 });
    this.batterySensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .updateValue(0);
    services.push(this.batterySensor);

    // Battery Service
    // Battery Service
    this.batteryService = new Service.Battery(this.name + ' Battery', 'battery');
    this.batteryService.getCharacteristic(Characteristic.BatteryLevel);
    this.batteryService.getCharacteristic(Characteristic.ChargingState);
    this.batteryService.getCharacteristic(Characteristic.StatusLowBattery);
    services.push(this.batteryService);

    // History
    this.loggingService = new FakeGatoHistoryService('battery', this);
    services.push(this.loggingService);

    // Info
    this.informationService = new Service.AccessoryInformation();
    this.informationService
        .setCharacteristic(Characteristic.Name, this.value.Name)
        .setCharacteristic(Characteristic.Manufacturer, this.value.Manufacturer)
        .setCharacteristic(Characteristic.Model, this.value.Model)
        .setCharacteristic(Characteristic.SerialNumber, this.value.SerialNumber);
    services.push(this.informationService);

    return services;
};
