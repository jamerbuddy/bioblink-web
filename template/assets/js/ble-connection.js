

var bluetoothDevice;
var stateMachineCharacteristic;
var batteryLevelCharacteristic;

// uuids
var BLINK_SERVICE_UUID = '569a180f-b87f-490c-92cb-11ba5ea5167c'
var STATE_MACHINE_CHARACTERISTIC_UUID = '569a2033-b87f-490c-92cb-11ba5ea5167c'
var BATTERY_LEVEL_CHARACTERISTIC_UUID = '569a2a19-b87f-490c-92cb-11ba5ea5167c'

class Characteristic {
    constructor(characteristicUuid, serviceUuid) {
        this.characteristicUuid = characteristicUuid;
        this.serviceUuid = serviceUuid;
    }

    setupConnection() {}
    onValueChange() {}
}

function onReadStateMachineButton() {
    return (bluetoothDevice ? Promise.resolve() : requestDevice())
    .then(setupStateMachineCharacteristic)
    .then(_ => {
        console.log('Reading state machine value...');
        return stateMachineCharacteristic.readValue();
    })
    .then(_ => {
        onStartNotificationsStateMachine()
    })
    .catch(error => {
        console.log('Argh! ' + error);
    });
}

function onReadBatteryLevelButton() {
    return (bluetoothDevice ? Promise.resolve() : requestDevice())
    .then(setupBatteryLevelCharacteristic)
    .then(_ => {
        console.log('Reading battery level value...');
        return batteryLevelCharacteristic.readValue();
    }).then(_ => {
        onStartNotificationsBatteryLevel()
    })
    .catch(error => {
        console.log('Argh! ' + error);
    });
}

function onStartNotifications() {
    return Promise.resolve()
    .then(onReadStateMachineButton)
    .then(onReadBatteryLevelButton)
}

function requestDevice() {
    console.log('Requesting any Bluetooth Device...');
    return navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLINK_SERVICE_UUID]
    })
    .then(device => {
        bluetoothDevice = device;
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
    });
}

function setupStateMachineCharacteristic() {
    if (bluetoothDevice.gatt.connected && stateMachineCharacteristic) {
        return Promise.resolve();
    }

    console.log('Connecting to GATT Server...');
    return bluetoothDevice.gatt.connect()
    .then(server => {
        console.log('Getting blink service...');
        return server.getPrimaryService(BLINK_SERVICE_UUID);
    })
    .then(service => {
        console.log('Getting state machine characteristic...');
        return service.getCharacteristic(STATE_MACHINE_CHARACTERISTIC_UUID);
    })
    .then(characteristic => {
        console.log('> State machine characteristic setup')
        stateMachineCharacteristic = characteristic;
        stateMachineCharacteristic.addEventListener('characteristicvaluechanged',
            handleStateValueChange);
    });
}

function setupBatteryLevelCharacteristic() {
    if (bluetoothDevice.gatt.connected && batteryLevelCharacteristic) {
        return Promise.resolve();
    }

    console.log('Connecting to GATT Server...');
    return bluetoothDevice.gatt.connect()
    .then(server => {
        console.log('Getting blink service...');
        return server.getPrimaryService(BLINK_SERVICE_UUID);
    })
    .then(service => {
        console.log('Getting battery level characteristic...');
        return service.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC_UUID);
    })
    .then(characteristic => {
        console.log('> Battery level characteristic setup')
        batteryLevelCharacteristic = characteristic;
        batteryLevelCharacteristic.addEventListener('characteristicvaluechanged',
            handleBatteryLevelChange);
    });
}



function handleBatteryLevelChange(event) {
    let value = event.target.value.getUint8(0);
}

function onStartNotificationsStateMachine() {
    console.log('Starting notifications for state machine...');
    stateMachineCharacteristic.startNotifications()
    .then(_ => {
        console.log('> Notifications started for state machine');
    })
    .catch(error => {
        console.log('Argh! ' + error);
    });
}

function onStartNotificationsBatteryLevel() {
    console.log('Starting notifications for battery level...');
    batteryLevelCharacteristic.startNotifications()
    .then(_ => {
        console.log('> Notifications started for battery level');
    })
    .catch(error => {
        console.log('Argh! ' + error);
    });
}

function onDisconnected() {
    console.log('> Bluetooth Device disconnected');
}

document.querySelector('#connect-bluetooth').addEventListener('click', function() {
    onStartNotifications();
});

'use strict';

document.addEventListener('keypress', logKey);

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

var VOLTAGE_ON = 3.3

var blinkLevel = 0;
var blinks = [];
var risingTimestamp = 0;

var currTimestamp = 200;

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

            // console.log("Rising, between: " + betweenBlinks)
        } else {
            var blink = new Blink(risingTimestamp, timestamp)
            blinks.push(blink)
            console.log("Blink detected, duration: " + blink.duration + "ms");

            const averageBlinkDuration = Math.round(blinks.reduce((total, next) => total + next.duration, 0) / blinks.length);



            document.getElementById("avg-blink-duration").innerHTML =  averageBlinkDuration + "ms";
        }   
    }
}

function handleStateValueChange(event) {
    let value = event.target.value.getUint8(0);
    if (value != blinkLevel) {
        blinkLevel = value
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




