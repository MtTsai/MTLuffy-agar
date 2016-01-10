/* 2D operation */
function Add2D(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

function Minus2D(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

function Mul2D(v1, m) {
    return [v1[0] * m, v1[1] * m];
}

function Div2D(v1, m) {
    return [v1[0] / m, v1[1] / m];
}

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

    var ctop = canvas.getBoundingClientRect().top;
    var cleft = canvas.getBoundingClientRect().left;

    var game = {
        gravity: [0, 0],
        own_circle: [],
        circles: [],
        foods: []
    };

    var game_updator = {
        gravity: [0, 0],
        own_circle: [],
        circles: [],
        foods: []
    };

    window.onload = displayWindowSize;

    function displayWindowSize() {
        // set canvas to 80% of full browser height, 100% of width
        canvas.width = width;
        canvas.height = height * 80 / 100;
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

    function relocation(pos, contrast, rate) {
        var _position = Mul2D(Minus2D(pos, contrast), rate);

        // move to center of canvas
        return Add2D(_position, [canvas.width / 2, canvas.height / 2]);
    }

    function drawBall(_pos, _radius, _rate) {
        var posInCanvas = relocation(_pos, game.gravity, _rate);
        var radiusInCanvas = _radius * _rate;

        drawCircle(posInCanvas, radiusInCanvas);
    }

    // websocket event
    function queryData() {
        game_updator = {
            gravity: [0, 0],
            own_circle: [],
            circles: [],
            foods: []
        };

        socket.emit('queryData');
    }

    socket.on('queryDir', function() {
        var x = mouse.pos.x - canvas.width / 2;
        var y = mouse.pos.y - canvas.height / 2;
        socket.emit('updatePos', [x, y]);
    });

    socket.on('updateGravity', function (_gravity) {
        game_updator.gravity = _gravity;
    });

    socket.on('updateOwn', function (_own) {
        game_updator.own_circle.push(_own);
    });

    socket.on('updateCircle', function (_circle) {
        game_updator.circles.push(_circle);
    });

    socket.on('updateFood', function (_food) {
        game_updator.foods.push(_food);
    });

    socket.on('drawCircle', function () {
        game = game_updator;

        // query data per 100ms
        setTimeout(queryData, 100);
    });

    // key event
    window.onkeyup = function(e) {
        var key = e.keyCode ? e.keyCode : e.which;

        if (key == 32) { // space
            var x = mouse.pos.x - canvas.width / 2;
            var y = mouse.pos.y - canvas.height / 2;

            socket.emit('skill-split', [x, y]);
        }
    }

    function getTotalScore() {
        var total_score = 0;

        for (var i in game.own_circle) {
            var _ball = game.own_circle[i];

            total_score += _ball.score;
        }

        return total_score;
    }

    function getAmplifyRate(score) {
        return Math.pow(90000 / getTotalScore(), (1 / 8));
    }

    function updateFrame() {
        var rate = getAmplifyRate();

        // clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw own circle
        for (var i in  game.own_circle) {
            var _ball = game.own_circle[i];

            drawBall(_ball.pos, _ball.radius, rate);
        }

        // draw circles
        for (var i in game.circles) {
            var _ball = game.circles[i];

            drawBall(_ball.pos, _ball.radius, rate);
        }

        // draw foods
        for (var i in game.foods) {
            var _food = game.foods[i];

            drawBall(_food.pos, _food.radius, rate);
        }
    }

    // do the query first time
    queryData();

    // set update frame with interval 100ms
    setInterval(updateFrame, 100);
});
