var Database = require('./db');
var db = new Database();

module.exports = function (client) {
    var self = this;
    var user = null;

    if (!self.clients) self.clients = {};

    client.on('connect', function (packet) {
        self.clients[packet.clientId] = client;
        client.id = packet.clientId;
        console.log("CONNECT: client id: " + client.id);
        if (packet.username === undefined) {
            client.connack({returnCode: 4});
        }
        user = packet.username;
        client.subscriptions = [];
        client.connack({returnCode: 0});
    });

    client.on('subscribe', function (packet) {
        var topic = packet.subscriptions[0].topic.toString();
        if (!/device\/(\d)/.test(topic) || /device\/(\d)/.exec(topic).length < 1) {
            return client.connack({returnCode: 6});
        }
        console.log("SUBSCRIBE(%s): %j", client.id, packet);
        var deviceId = parseInt(/device\/(\d)/.exec(topic)[1]);
        var payload = {user: parseInt(user), device: deviceId};
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
            var qos = packet.subscriptions[i].qos
                , topic = packet.subscriptions[i].topic
                , reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') + '$');

            granted.push(qos);
            client.subscriptions.push(reg);
            console.log(reg);
        }

        client.suback({messageId: packet.messageId, granted: granted});

        db.subscribe(payload, function (results) {
            client.publish({
                topic: topic,
                payload: JSON.stringify(results)
            });
        });
    });

    client.on('publish', function (packet) {
        var topic = packet.topic.toString();
        var topicRegex = /device\/(\d)/;
        if (!topicRegex.test(topic) || topicRegex.exec(topic).length < 1) {
            return client.connack({returnCode: 6});
        }
        console.log("PUBLISH(%s): %j", packet.clientId, packet);
        var deviceId = parseInt(topicRegex.exec(topic)[1]);

        var payload;
        try {
            payload = JSON.parse(packet.payload);
        } catch (err) {
            console.log(err);
            return client.connack({returnCode: 6});
        }
        payload.user = parseInt(user);
        payload.device = deviceId;
        db.insert(payload);

        for (var k in self.clients) {
            var _client = self.clients[k];

            for (var i = 0; i < _client.subscriptions.length; i++) {
                var subscription = _client.subscriptions[i];

                if (subscription.test(packet.topic)) {
                    _client.publish({topic: packet.topic, payload: payload});
                    break;
                }
            }
        }
    });

    client.on('pingreq', function (packet) {
        console.log('PINGREQ(%s)', client.id);
        client.pingresp();
    });

    client.on('disconnect', function (packet) {
        client.stream.end();
    });

    client.on('close', function (packet) {
        delete self.clients[client.id];
    });

    client.on('error', function (e) {
        client.stream.end();
        console.log(e);
    });
};