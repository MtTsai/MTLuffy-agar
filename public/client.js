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
    /* settings */
    var map = {
        width: 1980,
        height: 1024
    };

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

    // game related
    var settings = {
        clk: 100, // server query dir per 100ms
        emuRate: 1 // emulation of movement per clk
    };
    settings.frameRate = settings.clk / settings.emuRate; // ms per frame

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

    // get img
    function getImg(imgid) {
        var _img = 'black';
        switch (imgid) {
            case 0:
                _img = 'red';
                break;
            case 1:
                _img = 'green';
                break;
            case 2:
                _img = 'yellow';
                break;
            case 3:
                _img = 'black';
                break;
            default:
                socket.emit('debug', [imgid, -100]);
        }

        return _img;
    }

    // draw circle
    function drawCircle(pos, radius, imgid) {
        var centerX = pos[0];
        var centerY = pos[1];
        
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = getImg(imgid);
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

    function ballInCanvas(_pos, _radius) {
        if ((_pos[0] > (0 - _radius) && _pos[0] < (canvas.width + _radius)) &&
            (_pos[1] > (0 - _radius) && _pos[1] < (canvas.height + _radius))) {
            return true;
        }
        return false;
    }

    function drawBall(_ball, _rate) {
        var posInCanvas = relocation(_ball.pos, game.gravity, _rate);
        var radiusInCanvas = _ball.radius * _rate;

        if (ballInCanvas(posInCanvas, radiusInCanvas)) {
            drawCircle(posInCanvas, radiusInCanvas, _ball.imgid);
        }
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
        setTimeout(queryData, settings.clk);
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

    function emulatorMove(_ball) {
        var movement = Mul2D(_ball.dir, (_ball.speed) / settings.emuRate);
        _ball.pos = Add2D(_ball.pos, movement);

        // handle marginal case
        if (_ball.pos[0] < 0) {
            _ball.pos[0] = 0;
        }
        else if (_ball.pos[0] > map.width) {
            _ball.pos[0] = map.width;
        }
        if (_ball.pos[1] < 0) {
            _ball.pos[1] = 0;
        }
        else if (_ball.pos[1] > map.height) {
            _ball.pos[1] = map.height;
        }
    }

    function updateGravity() {
        var total_score = 0;
        var total_x = 0;
        var total_y = 0;

        for (var ballId in game.own_circle) {
            var _ball = game.own_circle[ballId];

            total_score += _ball.score;
            total_x += _ball.pos[0] * _ball.score;
            total_y += _ball.pos[1] * _ball.score;
        }

        game.gravity = [total_x / total_score, total_y / total_score];
    }

    function emulation() {
        // own circle
        for (var i in  game.own_circle) {
            var _ball = game.own_circle[i];

            emulatorMove(_ball);
        }

        // other circles
        for (var i in game.circles) {
            var _ball = game.circles[i];

            emulatorMove(_ball);
        }

        updateGravity();
    }

    function updateFrame() {
        var rate = getAmplifyRate();

        // clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw foods
        for (var i in game.foods) {
            var _food = game.foods[i];

            drawBall(_food, rate);
        }

        // draw circles
        for (var i in game.circles) {
            var _ball = game.circles[i];

            drawBall(_ball, rate);
        }

        // draw own circle
        for (var i in  game.own_circle) {
            var _ball = game.own_circle[i];

            drawBall(_ball, rate);
        }
    }

    // do the query first time
    queryData();

    // set update frame with interval 100ms
    setInterval(updateFrame, settings.frameRate);
});
