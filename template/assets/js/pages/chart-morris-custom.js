'use strict';

document.addEventListener('keypress', logKey);

class Blink {
    constructor(risingEdgeTime, fallingEdgeTime) {
        // UNIX timestamps (milliseconds since 1980)
        this.risingEdgeTime = risingEdgeTime
        this.fallingEdgeTime = fallingEdgeTime
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

var chartData = [
    {
        timestamp: 0,
        a: 0,
        voltage: 0,
    },
    {
        timestamp: 19,
        a: 0,
        voltage: 0

    },
    {
        timestamp: 20,
        a: 0,
        voltage: VOLTAGE_ON
    },
    {
        timestamp: 50,
        a: 0,
        voltage: VOLTAGE_ON,
    },
    {
        timestamp: 51,
        a: 0,
        voltage: 0,
    },
    {
        timestamp: 99,
        a: 0,
        voltage: 0
    },
    {
        timestamp: 100,
        a: 0,
        voltage: VOLTAGE_ON
    },
    {
        timestamp: 150,
        a: 0,
        voltage: VOLTAGE_ON
    },
    {
        timestamp: 151,
        a: 0,
        voltage: 0
    },
    {
        timestamp: 200,
        a: 0,
        voltage: 0
    },
]

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
    console.log("Update graph")
    currTimestamp += 50

    chartData.shift()
    var currVoltage = blinkLevel == 1 ? VOLTAGE_ON : 0
    chartData.push({
        timestamp: currTimestamp,
        a: 0,
        voltage: currVoltage
    })

    blinkChart.setData(chartData)
}, 1000);



function logKey(e) {
    // Change in blink level detected
    if (e.keyCode == 98) {
        blinkLevel = 1 - blinkLevel
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




