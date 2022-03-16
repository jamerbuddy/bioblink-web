

// uuids
var BLINK_SERVICE_UUID = '569a180f-b87f-490c-92cb-11ba5ea5167c';
var COMPARATOR_CHARACTERISTIC_UUID = '569a2033-b87f-490c-92cb-11ba5ea5167c';
var ADC_CHARACTERISTIC_UUID = '569a2032-b87f-490c-92cb-11ba5ea5167c';
var BATTERY_CHARACTERISTIC_UUID = '569a2a19-b87f-490c-92cb-11ba5ea5167c';
var HAPTIC_COUNT_CHARACTERISTIC_UUID = '569a2030-b87f-490c-92cb-11ba5ea5167c';
var HAPTIC_INTERVAL_CHARACTERISTIC_UUID = '569a2035-b87f-490c-92cb-11ba5ea5167c';
var DATABASE_ENABLED = false;

// GLASSES MAC: CA:26:44:A2:CE:40
// DEVKIT MAC:  EF:14:68:22:A8:1B

var bluetoothDevice = null;
var hapticIntervalCharacteristic = null;

var blinks = [];
var betweenBlinksArr = []

var sumBlinkDuration = 0;
var sumBetweenBlinks = 0;

var blinkLevel = 0;
var risingTimestamp = 0;

var VOLTAGE_ON = 3.3;
var currTimestamp = 0;
var chartData = Array(50).fill(
    {
        timestamp: 0,
        a: 0,
        voltage: 0,
    }
)
var blinkChart = Morris.Area({
    element: 'morris-area-chart',
    data: chartData,
    xkey: 'timestamp',
    ykeys: ['a', 'voltage'],
    labels: ['Series A', 'Series B'],
    pointSize: 0,
    fillOpacity: 0.8,
    pointStrokeColors: ['#b4becb', '#A389D4'],
    behaveLikeLine: true,
    gridLineColor: '#e0e0e0',
    lineWidth: 0,
    smooth: false,
    hideHover: 'auto',
    responsive:true,
    lineColors: ['#b4becb', '#A389D4'],
    resize: true
});

class Blink {
    constructor(risingEdgeTime, fallingEdgeTime) {
        // UNIX timestamps (milliseconds since 1980)
        this.risingEdgeTime = risingEdgeTime
        this.fallingEdgeTime = fallingEdgeTime
    }

    get duration() {
        return this.calcDuration()
    }

    calcDuration() {
        return this.fallingEdgeTime - this.risingEdgeTime
    }
}

class Characteristic {
    constructor(characteristicUuid, onValueChange, identifier) {
        this.characteristicUuid = characteristicUuid;
        this.onValueChange = onValueChange;
        this.identifier = identifier;
        this.characteristicObject = null; 
    }

    // PUBLIC FUNCTIONS
    onValueChange() {}

    updateValue(value) {
        console.log(`Updating ${this.identifier} characteristic...`)
        return Promise.resolve()
        .then(_ => {
            return this.characteristicObject.writeValueWithoutResponse(value)
        })
        .then(_ => {
            console.log(`> ${this.identifier} successfully updated`)
        })
        .catch(error => {
            console.log(`Error with updating characteristic ${this.identifier}: ${error}`);
        });
    }

    setup() {
        console.log('Connecting to GATT Server...');
        return bluetoothDevice.gatt.connect()
        .then(server => {
            console.log('Getting blink service...');
            return server.getPrimaryService(BLINK_SERVICE_UUID);
        })
        .then(service => {
            console.log(`Getting ${this.identifier} characteristic...`);
            return service.getCharacteristic(this.characteristicUuid);
        })
        .then(characteristic => {
            this.characteristicObject = characteristic;
            this.characteristicObject.addEventListener('characteristicvaluechanged',
                this.onValueChange);

            console.log(`> ${this.identifier} characteristic successfully saved`)
            return characteristic
        })
        .then(characteristic => {
            console.log(`> Starting notifications for ${this.identifier} characteristic...`)
            characteristic.startNotifications()
        })
        .then(_ => {
            console.log(`> ${this.identifier} characteristic finished setup`)
        })
        .catch(error => {
            console.log(`Error with setting up characteristic: ${error}`);
        });
    }
}

function handleComparatorChange(event) {
    let value = event.target.value.getUint8(0);

    // Only handle when blink value toggles
    if (value != blinkLevel) {
        blinkLevel = value
        handleBlink()
    }
}

function handleBlink() {
    var isRisingEdge = blinkLevel == 1
    var timestamp = Date.now()

    if (isRisingEdge) {
        risingTimestamp = timestamp;

        var betweenBlinks = 0
        if (blinks.length > 0) {
            var betweenBlinks = timestamp - blinks[blinks.length - 1].fallingEdgeTime
            betweenBlinksArr.push(betweenBlinks)

            sumBetweenBlinks += betweenBlinks

            var averageBetweenBlinks = Math.round(sumBetweenBlinks / betweenBlinksArr.length)

            document.getElementById("avg-between-blinks").innerHTML = averageBetweenBlinks  + "ms";
        }

        console.log("COMPARATOR Rising, between: " + betweenBlinks)
    } else {
        var fallingTimestamp = timestamp
        var blink = new Blink(risingTimestamp, fallingTimestamp)
        blinks.push(blink)

        if (DATABASE_ENABLED) {
            postBlink(risingTimestamp, fallingTimestamp)
        }
        console.log("COMPARATOR Falling, duration: " + blink.duration + "ms");

        sumBlinkDuration += blink.duration

        var averageBlinkDuration = Math.round(sumBlinkDuration / blinks.length)
        document.getElementById("avg-blink-duration").innerHTML =  averageBlinkDuration + "ms";
    }

}

function postBlink(rising_time, falling_time) {
    let post_blink_url = "http://localhost:5000/blinks";

    let xhr = new XMLHttpRequest();
    xhr.open("POST", post_blink_url);

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            console.log("Blink saved in DB");
        }};

    let data = {
        rising_time: rising_time,
        falling_time: falling_time
    }

    let json_string = JSON.stringify(data)

    xhr.send(json_string)
}

function handleHapticCountChange(event) {
    let value = event.target.value.getUint8(0);

    document.getElementById("haptic-count").innerHTML =  value;
    console.log("HAPTIC_COUNT change: " + value)
}

function handleBatteryChange(event) {
    let value = event.target.value.getUint16(0, true);
    let batteryPercent = convertRawBatteryAdcValue(value)
    document.getElementById("battery").innerHTML =  batteryPercent + "%";
    console.log("BATTERY change: " + batteryPercent)
}

function requestBluetoothDevice() {
    console.log('Requesting any Bluetooth Device...');
    return navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLINK_SERVICE_UUID]
    })
    .then(device => {
        console.log('> Bluetooth device succesfully saved')
        bluetoothDevice = device;
    });
}

function convertRawBatteryAdcValue(rawValue) {
    var voltage = (rawValue) / 1706.67 *  2 * 1000
    
    var thresholdsVoltage = [4200, 4150, 4110, 4080, 4020, 3980, 3950, 3910, 3870, 3840, 3820, 3800, 3790, 3770, 3750, 3730, 3710, 3690, 3610, 3270]
    var thresholdsPercent = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0]

    for (var i = 0; i < 20; i++) {
        if (voltage > thresholdsVoltage[i]) {
            return thresholdsPercent[i]
        }
    }
    
    return 0
}

function logKey(e) {
    // On B key press
    if (e.keyCode == 98) {
        // Toggle blink
        blinkLevel = 1 - blinkLevel
        handleBlink()
    } else if (e.keyCode == 97) {
        // Toggle blink
    }
}

function updateHapticInterval() {
    console.log("Updating value")
    const buffer = new ArrayBuffer(2);
    var val = parseInt(document.getElementById('input-interval').value);
    var array = new Int16Array(buffer);
    array[0] = val;

    hapticIntervalCharacteristic.updateValue(buffer)
}

function connectBluetooth() {
    return Promise.resolve()
    .then(requestBluetoothDevice)
    .then(_ => {
        var comparatorCharacteristic = new Characteristic(COMPARATOR_CHARACTERISTIC_UUID, handleComparatorChange, "COMPARATOR");
        return comparatorCharacteristic.setup()
    })
    .then(_ => {
        var hapticCountCharacteristic = new Characteristic(HAPTIC_COUNT_CHARACTERISTIC_UUID, handleHapticCountChange, "HAPTIC_COUNT");
        return hapticCountCharacteristic.setup()
    })
    .then(_ => {
        var batteryCharacteristic = new Characteristic(BATTERY_CHARACTERISTIC_UUID, handleBatteryChange, "BATTERY");
        return batteryCharacteristic.setup()
    })
    .then(_ => {
        hapticIntervalCharacteristic = new Characteristic(HAPTIC_INTERVAL_CHARACTERISTIC_UUID, handleHapticInteralChange, "HAPTIC_INTERVAL");
        return hapticIntervalCharacteristic.setup()
    });
}

function handleHapticInteralChange(event) {
    console.log("HAPTIC_INTERVAL changed")
}

document.querySelector('#connect-bluetooth').addEventListener('click', function() {
    connectBluetooth();
});

document.querySelector('#btn-save-interval').addEventListener('click', function() {
    updateHapticInterval();
});

'use strict';

document.addEventListener('keypress', logKey);

var intervalId = window.setInterval(function(){
    currTimestamp += 50

    chartData.shift()
    var currVoltage = blinkLevel == 1 ? VOLTAGE_ON : 0
    chartData.push({
        timestamp: currTimestamp,
        a: 0,
        voltage: currVoltage
    })

    blinkChart.setData(chartData)
}, 17);









