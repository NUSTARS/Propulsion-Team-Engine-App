// preload.js
//
// exposes variables to the renderer process 
// or something like that

const { contextBridge, ipcRenderer, dialog } = require('electron');
const { SerialPort } = require('serialport');
const fs = require('node:fs')

contextBridge.exposeInMainWorld('electronAPI', {
	onSerialPacket: (callback) => ipcRenderer.on('serial-packet', (_event, value) => callback(value)),
	getSerialPorts: () => SerialPort.list(),
	sendSerialPath: (path) => ipcRenderer.send('serial-path', path),
	sendLoadMain: (csvPath) => ipcRenderer.send('load-main', csvPath),
	sendControlMessage: (controlByte) => ipcRenderer.send('control-byte', controlByte),
	writeCSV: (line) => fs.appendFile("./log.csv", line, (err) => console.log(err)),
	copyCSV: (path) => fs.copyFile("./log.csv", path, (err) => console.log(err)),
	clearCSV: () => fs.unlink("./log.csv", (err) => console.log(err)),
	openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
});