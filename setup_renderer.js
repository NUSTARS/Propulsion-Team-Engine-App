// init_renderer.js
//
// renderer process code for setup

// variables


// main process
function setup_main() {
	updateSerialPortSelect();
}


// handle pin selection =====
// TODO 

// handle serial port selection and option reloading
const serialPortSelect = document.getElementById("serialport-select");
const serialPortReloadButton = document.getElementById("setup::reload-serialport-options")

async function updateSerialPortSelect() {
	await electronAPI.getSerialPorts().then((ports,err) => {
		// handle errors
		if (err) {
			console.log(err);
			return;
		}
		// remove pre-existing options
		serialPortSelect.length = 0;
		// TODO(?): make a message appear when there are no serial ports available
		serialPortSelect.add(new Option('none','none'));
		// add available paths
		ports.forEach(port => {
			const newPortOption = new Option(port.path, port.path);
			serialPortSelect.add(newPortOption);
		});
	})
}

serialPortReloadButton.addEventListener("click", updateSerialPortSelect);

const csvPathTextInput = document.getElementById("setup::csv-path");

// handle button start button press
const initEngineCommsButton = document.getElementById("setup::init-engine-comms");

function initEngineCommunication() {
	const path = serialPortSelect.value;
	// check that we have valid port (!= none)
	if (path === 'none') {
		console.log("invalid path");
		return;
	}
	// send serial port path
	electronAPI.sendSerialPath(path);
	
	// send message to load new page, including csv path
	electronAPI.sendLoadMain(csvPathTextInput.value + '.csv');
}

initEngineCommsButton.addEventListener("click", initEngineCommunication);

setup_main();

// Defining format of configuration message
//

/*
	Notes: 
	- dictionary mapping between 
*/
/* 
{
	"binary-actuators": [
		{
			"name": "fuel servo",
			"byte": 0,
			"bit": 0
		},
	],
	"sensors": [
		{
			"name": "pt-1"
			"start-index": 0
			"num-bytes": 1
		}
	]
	
}
*/





