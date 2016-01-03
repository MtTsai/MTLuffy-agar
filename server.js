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

/* variables */
var client_list = [];

/* Handling webSocket */
io.on('connection', function(socket) {
    var socketId = socket.id;
    console.log(socketId + 'is connecting');
    client_list[socketId] = {
        socket: socket,
        pos: [0, 0],
        radius: 10,
        speed: 5
    };

    socket.on('updatePos', function(pos) {
        var pos_ori = client_list[socketId].pos;
        var distance = Math.sqrt(Math.pow(pos[0] - pos_ori[0], 2) + Math.pow(pos[1] - pos_ori[1], 2));
        
        // distance cannot equal to 0
        // 0.01 is the distance enough small to stop the circle 
        if (distance > 0.01) {
            var movement_x = ((pos_ori[0] - pos[0]) / distance) * (client_list[socketId].speed / 1000);
            var movement_y = ((pos_ori[1] - pos[1]) / distance) * (client_list[socketId].speed / 1000);
            client_list[socketId].pos[0] = pos_ori[0] - movement_x;
            client_list[socketId].pos[1] = pos_ori[1] - movement_y;
        }

        // notify the client to update
        io.emit('reloadCircle');

        for (var i in client_list) {
            io.emit('updateCircle', client_list[i].pos, client_list[i].radius);
        }

        io.emit('drawCircle');
    });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        delete client_list[socketId];
    });

    // setting the query interval 100ms
    function queryPos() {
        io.emit('queryPos');
        setTimeout(queryPos, 100);
    }
    queryPos();
});

