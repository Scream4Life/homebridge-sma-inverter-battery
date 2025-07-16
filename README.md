# homebridge-sma-battery

**Homebridge plugin** to expose SMA inverter battery SoC (State of Charge) as a BatteryService in HomeKit/Eve.

---

## Installation

```bash
npm install -g homebridge-sma-battery
```

Ensure Homebridge is installed and running before adding this plugin.

---

## Configuration

Add the following accessory block to your `config.json` under the `accessories` section:

```json
{
  "accessory": "SMABattery",
  "name": "Battery Inverter",
  "hostname": "0.0.0.0", ---your ip
  "unitId": 3,
  "battery": true,
  "refreshInterval": 15,
  "debug": false
}
```

| Key               | Type      | Required | Default | Description                                       |
| ----------------- | --------- | -------- | ------- | ------------------------------------------------- |
| `accessory`       | `string`  | yes      | —       | Must be `SMABattery`                              |
| `name`            | `string`  | yes      | —       | Display name in HomeKit/Eve                       |
| `hostname`        | `string`  | yes      | —       | IP or DNS name of the SMA inverter                |
| `unitId`          | `number`  | no       | `3`     | Modbus Unit ID (usually `3` for battery inverter) |
| `battery`         | `boolean` | no       | `true`  | Enables BatteryService and SoC polling            |
| `refreshInterval` | `number`  | no       | `15`    | Polling interval in seconds                       |
| `debug`           | `boolean` | no       | `false` | Enable debug logging in Homebridge logs           |

---

## Features

* Reads Battery State of Charge from register `30845` over Modbus TCP.
* Exposes HomeKit BatteryService with:

  * **BatteryLevel** (0–100%)
  * **ChargingState** (always NOT\_CHARGING)
  * **StatusLowBattery** flag (<20%)
* Optional debug logs for raw and computed values.

---

## Example

```bash
[7/16/2025, 10:00:00 AM] [Battery Inverter] 🔄 Refresh Battery at 2025-07-16T10:00:00.000Z
[7/16/2025, 10:00:00 AM] [Battery Inverter] Battery SoC: raw=99, val=99%
```


