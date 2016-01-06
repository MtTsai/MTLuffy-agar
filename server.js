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


/* variables */
var client_list = [];
var food_list = [];

/* useful function */
function random (low, high) {
    return Math.random() * (high - low) + low;
}

function calc_dist(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
}

function cal_radius(rad1, rad2 ){
    return Math.sqrt( (rad1 * rad1) + (rad2 * rad2) );
}

function eat_balls(id) {
    // TODO: other player (can be eaten or eat others)

    // foods
    for (var i in food_list) {
        if (calc_dist(food_list[i].pos, client_list[id].pos) < client_list[id].radius) {
            client_list[id].radius = cal_radius( client_list[id].radius, food_list[i].radius);
            food_list.splice(i, 1);
        }
    }
}


function gen_foods() {
    food_list.push({
        pos: [random(0, map.width), random(0, map.height)],
        radius: 5
    });

    // generate the food per 10 secs
    setTimeout(gen_foods, 10000);
}

/* initialize */
for (var i = 0; i < 100; i++) {
    food_list.push({
        pos: [random(0, map.width), random(0, map.height)],
        radius: 5
    });
}
gen_foods();

/* Handling webSocket */
io.on('connection', function(socket) {
    var socketId = socket.id;
    console.log(socketId + ' is connecting');
    client_list[socketId] = {
        socket: socket,
        pos: [random(0, map.width), random(0, map.height)],
        radius: 10,
        speed: 10
    };

    socket.on('updatePos', function(dir) {
        var pos_ori = client_list[socketId].pos;
        var distance = calc_dist(dir, [0, 0]); // Math.sqrt(Math.pow(dir[0], 2) + Math.pow(dir[1], 2));
        
        // distance cannot equal to 0
        if (distance > client_list[socketId].radius) {
            var movement_x = (dir[0] / distance) * (client_list[socketId].speed);
            var movement_y = (dir[1] / distance) * (client_list[socketId].speed);
            client_list[socketId].pos[0] = pos_ori[0] + movement_x;
            client_list[socketId].pos[1] = pos_ori[1] + movement_y;

            // handle marginal case
            if (client_list[socketId].pos[0] < 0) {
                client_list[socketId].pos[0] = 0;
            }
            else if (client_list[socketId].pos[0] > map.width) {
                client_list[socketId].pos[0] = map.width;
            }
            if (client_list[socketId].pos[1] < 0) {
                client_list[socketId].pos[1] = 0;
            }
            else if (client_list[socketId].pos[1] > map.height) {
                client_list[socketId].pos[1] = map.height;
            }

            // check is there a ball can be eaten
            eat_balls(socketId);
        }
        else {
            // do nothing
            return;
        }
    });

    socket.on('queryData', function () {
        for (var i in client_list) {
            if (i == socketId) {
                socket.emit('updateOwn', client_list[i].pos, client_list[i].radius);
            }
            else {
                socket.emit('updateCircle', client_list[i].pos, client_list[i].radius);
            }
        }

        for (var i in food_list) {
            socket.emit('updateFood', food_list[i].pos, food_list[i].radius);
        }

        socket.emit('drawCircle');
    });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        delete client_list[socketId];
    });

    // using for debug
    socket.on('debug', function(pos) {
        console.log(pos[0] + ' ' + pos[1]);
    });

    // setting the query interval 25ms
    function queryDir() {
        socket.emit('queryDir');
        setTimeout(queryDir, 25);
    }
    queryDir();
});

