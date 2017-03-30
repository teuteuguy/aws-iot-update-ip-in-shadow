const awsIot = require('aws-iot-device-sdk');

// Load config file
const config = require('./config.json');

const os = require('os');
var ifaces = os.networkInterfaces();

console.log('[START] Start of update-ip-in-aws-iot-shadow application');

var configIoT = {
    "keyPath": config.iotKeyPath,
    "certPath": config.iotCertPath,
    "caPath": config.iotCaPath,
    "clientId": config.iotClientId,
    "region": config.iotRegion,
    "host": config.iotEndpoint,
    "reconnectPeriod": 300,
};

var thingState = {
    ip: null
};

console.log('[SETUP] thingShadow state initialized with:');
console.log(thingState);
console.log('[SETUP] Initializing IoT thingShadow with config:');
console.log(configIoT);

var thingShadow = awsIot.thingShadow(configIoT);

function getIPForInterface(interface) {
    var ip = null;

    if (ifaces[interface]) {

        ifaces[interface].forEach(function(iface) {
            if (iface.family == 'IPv4') {
                ip = iface.address;
            }
        });

    }

    return ip;
}

function refreshShadow() {
    // require('os').networkInterfaces().wlan0[0].address;

    thingState.ip = getIPForInterface((config.interface || 'eth0'));

    var toUpdate = {
        state: {
            reported: thingState
        }
    };

    console.log('[EVENT] refreshShadow(): Refhreshing the Shadow:');
    console.log(toUpdate);


    thingShadow.update(config.iotClientId, toUpdate);
    // thingShadow.publish('$aws/things/' + config.iotClientId + '/shadow/update', JSON.stringify(toUpdate));

    setTimeout(refreshShadow, (config.updateFreq || 300) * 1000);
}


thingShadow.on('connect', function() {
    console.log('[IOT EVENT] thingShadow.on(connect): Connection established to AWS IoT');
    console.log('[IOT EVENT] thingShadow.on(connect): Registring to thingShadow');
    thingShadow.register(config.iotClientId, {
        persistentSubscribe: true
    });

    setTimeout(refreshShadow, (config.updateFreq || 300) * 1000);
});

thingShadow.on('reconnect', function() {
    console.log('[IOT EVENT] thingShadow.on(reconnect) Trying to reconnect to AWS IoT');
});

thingShadow.on('close', function() {
    console.log('[IOT EVENT] thingShadow.on(close) Connection closed');
    console.log('[IOT EVENT] thingShadow.on(close) unregistring to shadow.');
    thingShadow.unregister(config.iotClientId);
});

thingShadow.on('error', function(err) {
    console.error('[IOT EVENT] thingShadow.on(error) error:', err);
    // process.exit();
    throw new Error('[ERROR] Lets crash the node code because of this error.');
});

thingShadow.on('status', function(thingName, stat, clientToken, stateObject) {
    console.log('[IOT EVENT] thingShadow.on(status): thingName:', thingName);
    console.log('[IOT EVENT] thingShadow.on(status): stat:', stat);
    console.log('[IOT EVENT] thingShadow.on(status): clientToken:', clientToken);
    console.log('[IOT EVENT] thingShadow.on(status): stateObject:', stateObject);
});
