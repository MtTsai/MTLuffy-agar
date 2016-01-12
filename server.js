/* Define dependencies. */
var express = require('express'),
    app = express(),
    http = require('http');

var server = http.createServer(app);
var io = require('socket.io').listen(server);
var port = 5566;

server.listen(port);
console.log("Server running on port: " + port);

/* set the front-end directory */
app.use(express.static(__dirname + '/public'));

/* settings */
var map = {
    width: 1980,
    height: 1024
};

var p_window = { // Player's visible window size
    width: 1980,
    height: 1024
};

var settings = {
    init_speed: 20
};


/* variables */
var socket_list = [];
var client_list = [];
var food_list = [];

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

/* player operation */
function calc_speed(_ball) {
    return settings.init_speed * (10 / _ball.radius);
}
function eat_balls(id, bid) {
    var player = client_list[id];
    var ball = player.list[bid];

    // TODO: other player (can be eaten or eat others)

    // foods
    for (var i in food_list) {
        var _food = food_list[i];

        if (calc_dist(_food.pos, ball.pos) < ball.radius) {
            ball.score = ball.score +_food.score;
            ball.radius = Math.sqrt(ball.score);

            // change speed of ball
            ball.speed = calc_speed(ball);

            // delete the eaten food
            food_list.splice(i, 1);
        }
    }
}

function updateGravity(id) {
    var player = client_list[id];
    var total_score = 0;
    var total_x = 0;
    var total_y = 0;

    for (var ballId in player.list) {
        var _ball = player.list[ballId];

        total_score += _ball.score;
        total_x += _ball.pos[0] * _ball.score;
        total_y += _ball.pos[1] * _ball.score;
    }

    player.gravity = [total_x / total_score, total_y / total_score];
}

function updatePlayerPosition(id) {
    var player = client_list[id];

    for (var ballId in player.list) {
        var _ball = player.list[ballId];

        // update the ball position
        var movement = Mul2D(_ball.dir, _ball.speed);

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

        // check is there a ball can be eaten
        eat_balls(id, ballId);
    }

    // update gravity
    updateGravity(id);
}

function updateAllPosition() {
    for (var id in client_list) {
        updatePlayerPosition(id);
    }
    for (var id in socket_list) {
        updatePosData(id);
    }
}

function updatePosData(socketId) {
    var socket = socket_list[socketId];
    var data = {
        own: client_list[socketId],
        others: [],
        foods: []
    };

    for (var i in client_list) {
        var player_t = client_list[i];

        if (i != socketId) {
            data.others.push(player_t);
        }
    }

    for (var i in food_list) {
        var _food = food_list[i];

        data.foods.push(_food);
    }

    var senddata = JSON.stringify(data);
    socket.emit('updatePosData', senddata);
}

/* food operation */
function food_create() {
    food_list.push({
        pos: [random(0, map.width), random(0, map.height)],
        radius: 5,
        score: 25,
        imgid: randomInt(0, 4)
    });
}

function gen_foods() {
    food_create();

    // generate the food per 10 secs
    setTimeout(gen_foods, 10000);
}
gen_foods();

/* initialize */
for (var i = 0; i < 100; i++) {
    food_create();
}

/* Handling webSocket */
function queryDir() {
    io.emit('queryDir');
}

io.on('connection', function(socket) {
    var socketId = socket.id;
    var random_pos = [random(0, map.width), random(0, map.height)];
    var random_imgid = randomInt(0, 4);
    console.log(socketId + ' is connecting');
    socket_list[socketId] = socket;
    client_list[socketId] = {
        gravity: random_pos, // center of gravity
        list: [{
            pos: random_pos,
            radius: 10,
            speed: settings.init_speed,
            dir: [0, 0], // unit vector
            score: 100,
            imgid: random_imgid
        }]
    };

    socket.on('updatePos', function(dir) {
        var player = client_list[socketId];
        
        // distance cannot equal to 0
        for (var ballId in player.list) {
            var _ball = player.list[ballId];
            var _ball_dir = Minus2D(dir, Minus2D(_ball.pos, player.gravity));
            var distance = calc_dist(_ball_dir, [0, 0]);

            // if distance > 10 then get the "unit vector" of dir
            // else ball will stop
            _ball.dir = (distance > 10) ? Div2D(_ball_dir, distance) : [0, 0];
        }
    });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        delete client_list[socketId];
    });

    socket.on('skill-split', function(dir) {
        var player = client_list[socketId];
        var distance = calc_dist(dir, [0, 0]);
        var unit_vector = Div2D(dir, distance);
        var split_list = [];

        for (var ballId in player.list) {
            var _ball = player.list[ballId];

            if (_ball.score > 400) {
                _ball.score /= 2;
                _ball.radius = Math.sqrt(_ball.score);

                // change speed of ball
                _ball.speed = calc_speed(_ball);

                _ball.pos = Minus2D(_ball.pos, Mul2D(unit_vector, 100));

                split_list.push({
                        pos: Add2D(_ball.pos, Mul2D(unit_vector, 200)),
                        radius: _ball.radius,
                        speed: _ball.speed,
                        dir: unit_vector,
                        score: _ball.score,
                        imgid: _ball.imgid
                });
            }
        }

        // append split list
        player.list = player.list.concat(split_list);
    });

    // using for debug
    socket.on('debug', function(pos) {
        console.log(pos[0] + ' ' + pos[1]);
    });
});

// setting the query interval 100ms
setInterval(queryDir, 100);

// setting the position update interval 40ms
setInterval(updateAllPosition, 40);

