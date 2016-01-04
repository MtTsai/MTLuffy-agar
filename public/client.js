document.addEventListener("DOMContentLoaded", function() {
    var mouse = { 
        click: false,
        move: false,
        pos: {x:0, y:0},
        pos_prev: false
    };

    // get canvas element and create context
    var canvas  = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    var width   = window.innerWidth;
    var height  = window.innerHeight;
    var socket  = io.connect();

    var cwidth, cheight;
    var ctop = canvas.getBoundingClientRect().top;
    var cleft = canvas.getBoundingClientRect().left;

    var own_circle = {
            pos: [0, 0],
            radius: 0
        };
    var circles = [];
    var foods = [];

    window.onload = displayWindowSize;

    function displayWindowSize() {
        // set canvas to 80% of full browser height, 100% of width
        canvas.width = width;
        canvas.height = height * 80 / 100;

        cwidth = canvas.width;
        cheight = canvas.height;
    }

    // register mouse event handlers
    canvas.onmousedown = function(e){ mouse.click = true; };
    canvas.onmouseup = function(e){ mouse.click = false; };

    canvas.onmousemove = function(e) {
        mouse.pos.x = e.clientX;
        mouse.pos.y = e.clientY;

        mouse.move = true;
    };

    canvas.onmouseout = function(e) {
        mouse.pos.x = e.clientX;
        mouse.pos.y = e.clientY;
        
        mouse.click = false;
    }

    // draw circle
    function drawCircle(pos, radius) {
        var centerX = pos[0];
        var centerY = pos[1];
        
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = 'green';
        context.fill();
        context.lineWidth = 5;
        context.strokeStyle = '#003300';
        context.stroke();
    }

    // websocket event
    socket.on('queryDir', function() {
        var x = mouse.pos.x - own_circle.pos[0];
        var y = mouse.pos.y - own_circle.pos[1];
        socket.emit('updatePos', [x, y]);
    });

    socket.on('reloadCircle', function () {
        circles = [];
        foods = [];
    });

    socket.on('updateOwn', function (pos, radius) {
        own_circle = {pos: pos, radius: radius};
    });

    socket.on('updateCircle', function (pos, radius) {
        circles.push({pos: pos, radius: radius});
    });

    socket.on('updateFood', function (pos, radius) {
        foods.push({pos: pos, radius: radius});
    });

    socket.on('drawCircle', function () {
        // clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw own circle
        drawCircle([own_circle.pos[0], own_circle.pos[1]], own_circle.radius);

        // draw circles
        for (var i in circles) {
            drawCircle([circles[i].pos[0], circles[i].pos[1]], circles[i].radius);
        }

        // draw foods
        for (var i in foods) {
            drawCircle([foods[i].pos[0], foods[i].pos[1]], foods[i].radius);
        }
    });
});