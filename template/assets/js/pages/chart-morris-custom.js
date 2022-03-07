'use strict';
$(document).ready(function() {
    setTimeout(function() {
    Morris.Area({
        element: 'morris-area-chart',
        data: [
            {
                y: 0,
                a: 0,
                b: 0,
            },
            {
                y: 20,
                a: 0,
                b: 3.3
            },
            {
                y: 50,
                a: 0,
                b: 3.3,
            },
            {
                y: 60,
                a: 0,
                b: 0,
            },
            {
                y: 90,
                a: 0,
                b: 0
            },
            {
                y: 100,
                a: 0,
                b: 3.3
            },
            {
                y: 150,
                a: 0,
                b: 3.3
            },
            {
                y: 160,
                a: 0,
                b: 0
            },
            {
                y: 220,
                a: 0,
                b: 0
            },
            {
                y: 230,
                a: 0,
                b: 3.3
            },
            {
                y: 270,
                a: 0,
                b: 3.3
            },
            {
                y: 280,
                a: 0,
                b: 0
            },
            {
                y: 300,
                a: 0,
                b: 0, 
            },
            {
                y: 320,
                a: 0,
                b: 3.3
            },
            {
                y: 380,
                a: 0,
                b: 3.3
            },
        ],
        xkey: 'y',
        ykeys: ['a', 'b'],
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
    // [ area-angle-chart ] end
        }, 700);
});
