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

    var circles = [];

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
        // normalize mouse position to range 0.0 - 1.0
        mouse.pos.x = (e.clientX - cleft) / cwidth;
        mouse.pos.y = (e.clientY - ctop) / cheight;
        mouse.move = true;
    };

    canvas.onmouseout = function(e) {
        mouse.pos.x = (e.clientX - cleft) / cwidth;
        mouse.pos.y = (e.clientY - ctop) / cheight;
        
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
    socket.on('queryPos', function() {
        socket.emit('updatePos', [mouse.pos.x, mouse.pos.y]);
    });

    socket.on('reloadCircle', function () {
        circles = [];
    });

    socket.on('updateCircle', function (pos, radius) {
        circles.push({pos: pos, radius: radius});
    });

    socket.on('drawCircle', function () {
        // clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw circles
        for (var i in circles) {
            drawCircle([circles[i].pos[0] * cwidth, circles[i].pos[1] * cheight], circles[i].radius);
        }
    });
});
