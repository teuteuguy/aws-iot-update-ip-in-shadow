const awsIot = require('aws-iot-device-sdk');

// Load config file
const config = require('./config.json');

const os = require('os');

console.log('[START] Start of update-ip-in-aws-iot-shadow application');

var configIoT = {
    "keyPath": config.iotKeyPath,
    "certPath": config.iotCertPath,
    "caPath": config.iotCaPath,
    "clientId": config.iotClientId,
    "region": config.iotRegion,
    "host": config.iotEndpoint,
    "reconnectPeriod": 300,
    will: {
        topic: config.iotThingName + '/lwt',
        payload: JSON.stringify({
            state: {
                reported: {
                    ip: {
                        connected: false
                    }
                }
            }
        }),
        qos: 0,
        retain: false
    }
};

var thingState = {
    ip: {}
};

console.log('[SETUP] device state initialized with:');
console.log(JSON.stringify(thingState, null, 2));
console.log('[SETUP] Initializing IoT device with config:');
console.log(JSON.stringify(configIoT, null, 2));

function getIPForInterfaces() {
    var ip = {
        connected: true
    };

    var ifaces = os.networkInterfaces();

    for (var iface in ifaces) {
        if (iface != 'lo0') {
            ifaces[iface].forEach((info) => {
                if (info.family == 'IPv4') {
                    ip[iface] = {
                        ip: info.address
                    };
                }
            });
        }
    }

    return ip;
}


thingState.ip = getIPForInterfaces();

if (thingState.ip != {}) {
    console.log('[RUN] IP is:', JSON.stringify(thingState.ip, null, 2));

    var device = awsIot.device(configIoT);
    let getShadowClientToken = null;

    device.on('connect', function() {
        console.log('[IOT EVENT] device.on(connect): Connection established to AWS IoT');
        console.log('[IOT EVENT] device.on(connect): Registring to device');

        // In case you want to get the Shadow before doing anything. Uncomment following
        // device.subscribe('$aws/things/pizero/shadow/get/accepted', { qos: 1 }, (err, granted) => {
        //     if (err) {
        //         console.error('[IOT EVENT] device.on(connect): THERE WAS AN ERROR SUBSCRIBING', JSON.stringify(err, null, 2));
        //     } else {
        //         console.log('[IOT EVENT] device.on(connect): Subscription:', JSON.stringify(granted, null, 2));

        //         device.publish('$aws/things/pizero/shadow/get', '', { qos: 1 }, (err) => {
        //             if (err) {
        //                 console.error('[IOT EVENT] device.on(connect): THERE WAS AN ERROR GETTING THE SHADOW', JSON.stringify(err, null, 2));
        //             } else {
        //                 console.log('[IOT EVENT] device.on(connect): Get Shadow requested');
        //             }
        //         });
        //     }
        // });

        device.publish('$aws/things/' + config.iotThingName + '/shadow/update', JSON.stringify({
            state: {
                reported: thingState
            }
        }), {
            qos: 1
        }, (err) => {
            if (err) {
                console.error('[IOT EVENT] device.on(connect): THERE WAS AN ERROR', JSON.stringify(err, null, 2));
            } else {
                console.log('[IOT EVENT] device.on(connect): Shadow updated');
            }
            device.end();
        });
    });

    device.on('reconnect', () => {
        console.log('[IOT EVENT] device.on(reconnect) Trying to reconnect to AWS IoT');
    });

    device.on('close', () => {
        console.log('[IOT EVENT] device.on(close) Connection closed');
        // console.log('[IOT EVENT] device.on(close) unregistring to shadow.');
        // device.unregister(config.iotThingName);
    });

    device.on('error', (err) => {
        console.error('[IOT EVENT] device.on(error) error:', JSON.stringify(err, null, 2));
        // process.exit();
        throw new Error('[ERROR] Lets crash the node code because of this error.');
    });

    device.on('status', (thingName, stat, clientToken, stateObject) => {
        console.log('[IOT EVENT] device.on(status): thingName:', thingName);
        console.log('[IOT EVENT] device.on(status): stat:', stat);
        console.log('[IOT EVENT] device.on(status): clientToken:', clientToken);
        console.log('[IOT EVENT] device.on(status): stateObject:', stateObject);

    });

    device.on('message', (topic, payload) => {
        console.log('[IOT EVENT] device.on(message): topic:', topic);
        console.log('[IOT EVENT] device.on(message): payload:', JSON.stringify(JSON.parse(payload.toString()), null, 2));
    });

} else {
    console.log('[RUN] No IP.');
}