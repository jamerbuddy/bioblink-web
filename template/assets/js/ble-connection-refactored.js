

// uuids
var BLINK_SERVICE_UUID = '569a180f-b87f-490c-92cb-11ba5ea5167c'
var COMPARATOR_CHARACTERISTIC_UUID = '569a2033-b87f-490c-92cb-11ba5ea5167c'
var ADC_CHARACTERISTIC_UUID = '569a2032-b87f-490c-92cb-11ba5ea5167c'
var BATTERY_CHARACTERISTIC_UUID = '569a2a19-b87f-490c-92cb-11ba5ea5167c'
var HAPTIC_COUNT_CHARACTERISTIC_UUID = '569a2030-b87f-490c-92cb-11ba5ea5167c'
var HAPTIC_INTERVAL_CHARACTERISTIC_UUID = '569a2035-b87f-490c-92cb-11ba5ea5167c'

// CA:26:44:A2:CE:40
var blinks = [];
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
    constructor(characteristicUuid, onValueChange, identifier, bluetoothDevice) {
        this.characteristicUuid = characteristicUuid;
        this.onValueChange = onValueChange
        this.identifier = identifier
        this.bluetoothDevice = bluetoothDevice;
        this.characteristicObject = null;   
    }

    // PUBLIC FUNCTIONS
    onValueChange() {}

    updateValue(value) {
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
        return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice())
        .then(this.requestCharacteristic)
        .then(this.startNotifications)
        .then(() => {
            console.log(`> ${this.identifier} characteristic finished setup`)
            return this.bluetoothDevice;
        })
        .catch(error => {
            console.log(`Error with setting up characteristic ${this.identifier}: ${error}`);
        });
    }

    // INTERNAL FUNCTIONS
    requestDevice() {
        console.log('Requesting any Bluetooth Device...');
        return navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [BLINK_SERVICE_UUID]
        })
        .then(device => {
            console.log('> Bluetooth device succesfully saved')
            this.bluetoothDevice = device;
        });
    }

    requestCharacteristic() {
        if (this.bluetoothDevice.gatt.connected && this.characteristicObject) {
            return Promise.resolve();
        }
    
        console.log('Connecting to GATT Server...');
        return this.bluetoothDevice.gatt.connect()
        .then(server => {
            console.log('Getting blink service...');
            return server.getPrimaryService(BLINK_SERVICE_UUID);
        })
        .then(service => {
            console.log(`Getting ${this.identifier} characteristic...`);
            return service.getCharacteristic(this.characteristicUuid);
        })
        .then(characteristic => {
            console.log(`> ${this.identifier} characteristic successfully saved`)
            this.characteristicObject = characteristic;
            this.characteristicObject.addEventListener('characteristicvaluechanged',
                this.onValueChange);
        });
    }

    startNotifications() {
        console.log(`Starting notifications for ${this.identifier} characteristic...`);
        this.characteristicObject.startNotifications()
        .then(_ => {
            console.log(`> Notifications started for ${this.identifier} characteristic`);
        });
    }
}

function handleComparatorChange(event) {
    let value = event.target.value.getUint8(0);
    if (value != blinkLevel) {
        blinkLevel = value
        var isRisingEdge = blinkLevel == 1
        var timestamp = Date.now()
    
        if (isRisingEdge) {
            console.log("Rising")
            risingTimestamp = timestamp;
        } else {
            var blink = new Blink(risingTimestamp, timestamp)
            blinks.push(blink)
            console.log("Falling, duration: " + blink.calcDuration() + "ms");
        } 
    }
}

function logKey(e) {
    // Change in blink level detected
    if (e.keyCode == 98) {
        blinkLevel = 1 - blinkLevel
        var isRisingEdge = blinkLevel == 1
        var timestamp = Date.now()

        if (isRisingEdge) {
            
            risingTimestamp = timestamp;

            var betweenBlinks = 0
            if (blinks.length > 0) {
                var betweenBlinks = timestamp - blinks[blinks.length - 1].fallingEdgeTime
                betweenBlinksArr.push(betweenBlinks)

                const averageBetweenBlinks = Math.round(betweenBlinksArr.reduce((a, b) => a + b, 0) / betweenBlinksArr.length);
                document.getElementById("avg-between-blinks").innerHTML = averageBetweenBlinks  + "ms";
            }

            console.log("Rising, between: " + betweenBlinks)
        } else {
            var blink = new Blink(risingTimestamp, timestamp)
            blinks.push(blink)
            console.log("Falling, duration: " + blink.duration + "ms");

            const averageBlinkDuration = Math.round(blinks.reduce((total, next) => total + next.duration, 0) / blinks.length);



            document.getElementById("avg-blink-duration").innerHTML =  averageBlinkDuration + "ms";
        }   
    }
}

function connectBluetooth() {
    var comparatorCharacteristic = new Characteristic(COMPARATOR_CHARACTERISTIC_UUID, handleComparatorChange, "COMPARATOR");

    return Promise.resolve()
    .then(comparatorCharacteristic.setup);
}

document.querySelector('#connect-bluetooth').addEventListener('click', function() {
    connectBluetooth();
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
}, 7);


betweenBlinksArr = []






