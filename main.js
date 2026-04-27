// main.js
//
// main electron process or something like that

// requires
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { SerialPort } = require('serialport')
const { ByteLengthParser } = require('@serialport/parser-byte-length')
const { PacketLengthParser } = require('@serialport/parser-packet-length')


// singleton main BrowserWindow object
let mainWindow;

// function for opening the window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
	webPreferences: {
		sandbox: false,
		preload: path.join(__dirname, 'preload.js')
	}
  })

  mainWindow.loadFile('setup.html')
}


// opening the app
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// closing the app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// handle serial port operation

let sp;
let parser;

// FIXME WHEN APPROPRIATE TIME COMES !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// HUGE SAFETY CONCERN HERE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// (MAYBE)

// initialize, but do not start serial port
ipcMain.on('serial-path', (_event, path) => {
	if (path !== 'none' && !sp) {
		sp = new SerialPort({path: path, baudRate: 9600, autoOpen: false, dataBits: 8, parityBits: 'none', stopBits: 1});
	}
	else {
		// error
		// this should never run
		console.log("error: invaild serialport configuration");
	}
});

// load main page with all the graphs and buttons and stuff
ipcMain.on('load-main', (_event, csvPath) => {
	mainWindow.loadFile('index.html');
	console.log(csvPath);
	startLogging(csvPath);
});

function handleFileOpen() {
	dialog.showOpenDialog(mainWindow, {
  			properties: ['openFile','promptToCreate'],
			filters: [
				{name: 'csv', extensions: ['txt']},
			]
		}).then(result => {
			if (!result.canceled) {
				console.log(result.filePaths[0]);
				return result.filePaths[0];
			}
  			//console.log(result.canceled)
  			//console.log(result.filePaths)
		}).catch(err => {
  			console.log(err)
			return err;
		})
}

ipcMain.handle("dialog:openFile", handleFileOpen);



// handle sending bytes when we get the message
ipcMain.on('control-byte', (_event, controlByte) => {
	console.log(controlByte);
	sp.write(Buffer.from([controlByte]));
	
})


//sp = new SerialPort({path: 'COM3', baudRate: 9600});
//ports = [];
//sp.flush();
//sp.open();


function startLogging(csvPath) {
	//
	//new ByteLengthParser({length: 11})
	parser = sp.pipe(new PacketLengthParser({delimeter: 0xAA, packetOverhead: 2}));
	sp.open(() => {sp.flush()}); //
	
	// TODO write top row of CSV

	parser.on('data', (chunk) => {
		chunk = chunk.slice(2);
		console.log(chunk);
		// TODO: set up system of parsing serial packets
		
		// send chunk
		mainWindow.webContents.send('serial-packet', chunk);
		
		// only log if we have an actual title
		if (csvPath != '.csv') {
			let csvline = '';
			for (const val of chunk) {
				if (csvline == '') {
					csvline = csvline + String(val);
				}
				else {
					csvline = csvline + ', ' + String(val)
				}
			}
			csvline = csvline + '\n';
			
			fs.appendFile(csvPath, csvline, (err) => {});
			
		}
		
		/*
		for (const value of chunk) {
			
			//fs.appendFile('temp_log.txt', String(value) + '\n', (err) => {});
		}
		*/
		// log chunk to file
	});
}
/*

*/