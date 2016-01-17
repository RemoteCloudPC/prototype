import * as WebSocket from 'ws';

interface ConnectionPair {
    host: WebSocket;
    guest: WebSocket;
}

interface MessageHandler {
    (ws: WebSocket, message: any, rawData?: any): void;
}

const wss = new WebSocket.Server({ 'port': 8080 });
const connectionPairs: { [hostid: string]: ConnectionPair } = {};
const messageHandlers: { [messageType: string]: MessageHandler } = {
    'connect-host': onConnectHost,
    'connect-guest': onConnectGuest,
    'disconnect-host': onDisconnectHost,
    'disconnect-guest': onDisconnectGuest,
    'mouse-click': onMouseClick
};

wss.on('connection', ws => {
    ws.on('message', data => {
        const message = JSON.parse(data);
        messageHandlers[message.type](ws, message, data);
    });

    ws.on('close', () => {
        console.log('Connection closed.');
    });
});

function onConnectHost(ws: WebSocket, message: any) {
    const hostid = String(Math.floor(10000000 * Math.random()));
    connectionPairs[hostid] = { host: ws, guest: null };
    ws.send(JSON.stringify({
        type: 'create-hostid',
        hostid: hostid
    }));
}

function onConnectGuest(ws: WebSocket, message: any, rawData: any) {
    const hostid = message.hostid;
    if (hostid in connectionPairs) {
        connectionPairs[hostid].guest = ws;
        connectionPairs[hostid].host.send(rawData);
        ws.send(JSON.stringify({
            type: 'screen-size',
            width: 800,
            height: 600
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            description: 'Host not found.'
        }));
    }
}

function onDisconnectHost(ws: WebSocket, message: any) {
    const hostid = message.hostid;
    if (connectionPairs[hostid].guest != null) {
        connectionPairs[hostid].guest.send(JSON.stringify({
            type: 'error',
            description: 'Host disconnected.'
        }));
    }
    delete connectionPairs[hostid];
}

function onDisconnectGuest(ws: WebSocket, message: any, rawData: any) {
    const hostid = message.hostid;
    if (hostid in connectionPairs) {
        connectionPairs[hostid].host.send(rawData);
        connectionPairs[hostid].guest = null;
    }
}

function onMouseClick(ws: WebSocket, message: any, rawData: any) {
    connectionPairs[message.hostid].host.send(rawData);
}
