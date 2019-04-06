/* settings */
var map;

/* useful function */
function random (low, high) {
    return Math.random() * (high - low) + low;
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function calc_dist(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
}

function ball_on_wall(_ball) {
    if (_ball.pos[0] <= 0 || _ball.pos[0] >= map.width ||
        _ball.pos[1] <= 0 || _ball.pos[1] >= map.height) {
        return true;
    }
    return false;
}

function ball_on_corner(_ball) {
    if ((_ball.pos[0] <= 0 || _ball.pos[0] >= map.width) &&
        (_ball.pos[1] <= 0 || _ball.pos[1] >= map.height)) {
        return true;
    }
    return false;
}

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

function InPdt(v1, v2) { // Inner Product
    return v1[0] * v2[0] + v1[1] * v2[1];
}

function UnVec(v) {
    return Div2D(v, calc_dist(v, [0, 0]));
}

var socket_io = {
    id: 7899,
    func_map: [],
    on: function (key, func) {
        this.func_map[key] = func;
    },
    emit: function(key, data) {
        this.func_map[key](data);
    }
};

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
    // var socket  = io.connect();

    var ctop = canvas.getBoundingClientRect().top;
    var cleft = canvas.getBoundingClientRect().left;

    // game related
    var settings = {
        clk: 40, // server query dir per 100ms
        emuRate: 2 // emulation of movement per clk
    };
    settings.frameRate = settings.clk / settings.emuRate; // ms per frame

    var game = {
        gravity: [0, 0],
        own: [],
        others: [],
        foods: [],
        emuCount: settings.emuRate
    };

    var game_updator = {
        gravity: [0, 0],
        own: [],
        others: [],
        foods: [],
        emuCount: 0
    };

    var display_queue = [];

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
                socket_io.emit('debug', [imgid, -100]);
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
        // socket.emit('queryData');
        // io_updatePosData(updatePosData(7899));
        updateAllPosition();
    }

    // socket.on('queryDir', function() {
    socket_io.on('queryDir', function() {
        var rate = getAmplifyRate();
        var x = mouse.pos.x - canvas.width / 2;
        var y = mouse.pos.y - canvas.height / 2;
        var dir = Div2D([x, y], rate);
        socket_io.emit('updatePos', dir);
    });

    // socket.on('updatePosData', function (_data) {
    socket_io.on('updatePosData', function (_data) {
        var obj = JSON.parse(_data);

        game_updator = {
            gravity: [0, 0],
            own: [],
            others: [],
            foods: [],
            emuCount: 0
        };

        game_updator.gravity = obj.own.gravity;

        game_updator.own = obj.own;

        for (var i in obj.others) {
            game_updator.others.push(obj.others[i]);
        }

        for (var i in obj.foods) {
            game_updator.foods.push(obj.foods[i]);
        }

        display_queue.push(game_updator);
    });

    // key event
    window.onkeyup = function(e) {
        var key = e.keyCode ? e.keyCode : e.which;

        if (key == 32) { // space
            var x = mouse.pos.x - canvas.width / 2;
            var y = mouse.pos.y - canvas.height / 2;

            socket_io.emit('skill-split', [x, y]);
        }
    }

    function getTotalScore() {
        var total_score = 0;

        for (var i in game.own.list) {
            var _ball = game.own.list[i];

            total_score += _ball.score;
        }

        return total_score;
    }

    function getAmplifyRate(score) {
        return Math.pow(90000 / getTotalScore(), (1 / 8));
    }

    /*
     * WARNING: this function need to be modified both server & client side
     *
     *     1. Be careful to slow donw the ball speed to (1 / settings.emuRate)
     *     2. No need to eat balls & change the speed of out-of-control balls
     */
    function emulateMove(player) {
        // update the ball position first
        for (var ballId in player.list) {
            var _ball = player.list[ballId];

            var movement = Mul2D(_ball.dir, (_ball.speed) / settings.emuRate);

            _ball.pos = Add2D(_ball.pos, movement);
        }

        // handle marginal case
        for (var ballId in player.list) {
            var _ball = player.list[ballId];

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

        // handle the collision of balls
        for (var ballId in player.list) {
            var _ball = player.list[ballId];

            var movement = [0, 0];
            for (var bid_t in player.list) {
                var _ball_o = player.list[bid_t]; // ball other

                if (bid_t == ballId) {
                    continue;
                }

                // the balls priority (higher ball can push the lower)
                //     on corner > on wall > score
                if (!ball_on_corner(_ball_o)) {
                    if (ball_on_corner(_ball)) {
                        continue;
                    }
                    if (ball_on_wall(_ball) && !ball_on_wall(_ball_o)) {
                        continue;
                    }
                    if (ball_on_wall(_ball) && ball_on_wall(_ball_o)) { // both on the wall
                        if (_ball.score > _ball_o.score) {
                            continue;
                        }
                    }
                }

                var _dist_t = calc_dist(_ball.pos, _ball_o.pos); // distance after moving
                var _dist_min = _ball_o.radius + _ball.radius;

                if (_dist_t < _dist_min) { // ball is collision
                    var react_dir = UnVec(Minus2D(_ball.pos, _ball_o.pos));
                    var adjust_dist = _dist_min - _dist_t;

                    movement = Add2D(movement, Mul2D(react_dir, adjust_dist));
                }
            }

            _ball.pos = Add2D(_ball.pos, movement);
        }
    }

    function updateGravity() { // WARNING: this function need to be modified both server & client side
        var total_score = 0;
        var total_x = 0;
        var total_y = 0;

        for (var ballId in game.own.list) {
            var _ball = game.own.list[ballId];

            total_score += _ball.score;
            total_x += _ball.pos[0] * _ball.score;
            total_y += _ball.pos[1] * _ball.score;
        }

        game.gravity = [total_x / total_score, total_y / total_score];
    }

    function emulation() {
        // own circle
        emulateMove(game.own);

        // other others
        for (var i in game.others) {
            var _player = game.others[i];

            emulateMove(_player);
        }

        updateGravity();
    }

    function updateFrame() {
        var rate = getAmplifyRate();

        console.log("update Frame");
        if (display_queue.length == 0 && game.emuCount == settings.emuRate) {
            return;
        }
        while (display_queue.length > 1 || game.emuCount == settings.emuRate) {
            game = display_queue.shift();
        }

        // clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw foods
        for (var i in game.foods) {
            var _food = game.foods[i];

            drawBall(_food, rate);
        }

        // draw others
        for (var i in game.others) {
            var _player = game.others[i];

            for (var j in _player.list) {
                var _ball = _player.list[j];

                drawBall(_ball, rate);
            }
        }

        // draw own circle
        for (var i in  game.own.list) {
            var _ball = game.own.list[i];

            drawBall(_ball, rate);
        }

        emulation();
        game.emuCount++;
    }

    // Connection to server after all setup done
    io_connection(socket_io);

    // do the query first time
    queryData();

    // set update frame with interval 100ms
    setInterval(updateFrame, settings.frameRate);
});
