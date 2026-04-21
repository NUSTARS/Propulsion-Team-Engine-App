// renderer.js
//
// controls rendering processes
// or something like that

// constant holding the division where the canvases are stored
const canvasDiv = document.getElementById('canvas-division');
canvasDiv.style.height = '200px';

const switchDiv = document.getElementById('switch-division');

let timeoutID = null;

// SensorGraph class
class SensorGraph {
	// constructor
	// takes in an id of an html canvas element and a title
	// todo: add a data interpretation function? (ie scale integer to interpretable value)
	constructor(title, interpFn = (x) => x) {
		this.interpFn = interpFn;
		this.dataPoints = {
			labels: [],
			datasets: [{
				label: '',
				data: []
			}]
		}
		let thisDiv = document.createElement('div');
		thisDiv.style.display = 'inline-block';
		thisDiv.style.width = '200px';
		thisDiv.style.height = '200px';
		canvasDiv.appendChild(thisDiv);
		this.canvas = document.createElement('canvas');
		this.currentData = document.createElement('p');
		thisDiv.appendChild(this.canvas);
		thisDiv.appendChild(this.currentData);
		this.chart = new Chart(
			this.canvas,
			{
				type: 'line',
				data: this.dataPoints,
				options: {
					plugins: {
						legend: {
							display: false,
						},
						title: {
							display: true,
							text: title,
						}
					},
					aspectRatio: 1,
					animation: false, // set this to true if we want stuff to be animated
				}
			}
		);
	}
	
	

	// adds an (x, y) pair to the line chart and updates the chart
	addPoint(x,y) {
		this.dataPoints.labels.push(x);
		this.dataPoints.labels = this.dataPoints.labels.slice(-50);
		this.dataPoints.datasets[0].data.push(y);
		this.dataPoints.datasets[0].data = this.dataPoints.datasets[0].data.slice(-50);
		this.chart.data = this.dataPoints;
		this.currentData.textContent = y.toFixed(3);
		// perhaps remove this and put it in a callback?
		this.chart.update();
	}
	
}

// Switch code! (YET TO BE TESTED---MAY HAVE BROKEN EVERYTHING)
const switchType = Object.freeze({
	RELAY: 'relay',
	SOLENOID: 'solenoid',
	MOTORIZED: 'motorized'
});

// const switchCount = 0;

// function activateSwitch() {

// }

// function createSwitch(switchType, labelText) {
// 	const checkbox = document.createElement('input');
// 	this.checkbox.type = 'checkbox';
// 	this.checkbox.id = switchType + '-' + switchCount.toString();

// 	const label = document.createElement('label');
// 	label.htmlFor = checkbox.id;
// 	label.appendChild(document.createTextNode(labelText));

// 	switchDiv.appendChild(checkbox);
// 	switchDiv.appendChild(label);
// 	switchDiv.appendChild(document.createElement('br'));

// 	checkbox.addEventListener('change', activateSwitch);
// 	++switchCount;
// }

let controlState = 0;

class BinaryActuator {
	constructor(name, byteNum, bit) {
		this.on = false;
		//this.type = controlledElement;
		// add checkbox to division
		this.checkbox = document.createElement('input');
		this.checkbox.type = 'checkbox';
		this.checkbox.id = "myCheckbox";

		this.boxLabel = document.createElement('label');
		this.boxLabel.innerText = name;
		this.boxLabel.id = "checkboxLabel";
		this.boxLabel.for = name;

		switchDiv.appendChild(this.boxLabel);
		switchDiv.appendChild(this.checkbox);

		this.name = name;
		this.byteNum = byteNum;
		this.bit = bit;

		this.checkbox.addEventListener('change', () => {
			this.on = !this.on
			// branch on bit manipulations to control state
			if (this.on) { 
				controlState |= 1 << this.bit;
			} else {
				controlState &= ~(1 << this.bit);
			}
			electronAPI.sendControlMessage(controlState);
		})
	}
	uncheckBox(){
		this.checkbox.checked = false;
		this.on = false;
	}
}

// makes a pressure transducer interpretation function, 
// given the resistor's resistance
// in ohms as an input to the function
function makePTInterpFn(resistance, maxPressure) {
	return (x) => {
		volts = ((3.3/4095.0)*x)
		millivolts = volts * 20;
		milliamps = millivolts / resistance;
		
		slope = maxPressure/16;
		value = slope*(milliamps-4);
		return value;
	}
}

// (3.3/4095 * x) * 18.75 - 75
// some constants (temporary)
const num_graphs = 5;
maxPressures = [600, 600, 600, 300, 300];
prevArray = [0,0,0,0,0];
sensorNames = ['ox upstream','chamber','ox stag','ethanol upstream','ethanol stag'];


let graphs = [];
for (let i = 0; i < num_graphs; i++) {
	graphs.push(new SensorGraph(sensorNames[i], makePTInterpFn(1,maxPressures[i])));
}

solenoid1 = new BinaryActuator("Ethanol Solenoid (SV 1):", 0, 0)
solenoid2 = new BinaryActuator("Ox Solenoid (SV 2):", 0, 1)
servo1 = new BinaryActuator("Nitrogen Purge (SBV 2):", 0, 2)
servo2 = new BinaryActuator("Nitrogen In (SBV 1):", 0, 3)
sparkPlug = new BinaryActuator("Spark Plug:", 0, 4)

checkBoxes = [solenoid1, solenoid2, servo1, servo2, sparkPlug];

// emergency shutoff functionality
const emergencyShutoffButton = document.getElementById("emergencyShutoff");
emergencyShutoffButton.addEventListener("click", () => {
	if (timeoutID != null) {
		clearTimeout(timeoutID);
		timeoutID = null
	 };
	for (const box of checkBoxes){
		box.uncheckBox();
	}
	controlState = 0;
	electronAPI.sendControlMessage(0);
});

function turnOnEthanol(){
	controlState |= (1 << 1);
	electronAPI.sendControlMessage(controlState);
}

function turnOffEthanol(){
	controlState &= ~(1 << 1);
	electronAPI.sendControlMessage(controlState);
}

function turnOnOxygen(){
	controlState |= (1 << 0);
	electronAPI.sendControlMessage(controlState);
}

function turnOffOxygen(){
	controlState &= ~(1 << 0);
	electronAPI.sendControlMessage(controlState);
}

function turnOnSparkplugAndOxygen(){
	controlState |= (1 << 4);
	controlState |= (1 << 0);
	electronAPI.sendControlMessage(controlState);
}

function turnOffSparkplug(){
	controlState &= ~(1 << 4);
	electronAPI.sendControlMessage(controlState);
}

function turnOffEthanolAndOxygen(){
	controlState &= ~(1 << 0);
	controlState &= ~(1 << 1);
	electronAPI.sendControlMessage(controlState);
}

const coating_time = 2000;
const spark_time = 2000;
const burning_time = 4000;

// fire igniter functionality
const fireIgniterButton = document.getElementById("fireIgniter");
fireIgniterButton.addEventListener("click", () => {
	// turn on ethanol
	console.log("time in 1st");
	turnOnEthanol();
	timeoutID = setTimeout(() => {
		console.log("timeout 1st");
		// turn on oxygen and sparkplug
		turnOnSparkplugAndOxygen();
		// start next callback
		timeoutID = setTimeout(() => {
			console.log("timeout 2");
			// turn off sparkplug
			turnOffSparkplug();
			// start final callback
			
			timeoutID = setTimeout(() => {
				console.log("timeout 3");
				turnOffEthanolAndOxygen();
			}, burning_time - spark_time); // Z - Y ms

		}, spark_time); // Y ms

		
	}, coating_time); // X ms
});

// last minute calibration shit fixme
const ethanolSolenoidPeriodButton = document.getElementById("ethanolSolenoidPeriod");
ethanolSolenoidPeriodButton.addEventListener("click", () => {
	console.log("time in");
	turnOnEthanol();
	timeoutID = setTimeout(() => {
		console.log("timeout");
		turnOffEthanol();
	}, 5000);
});

const oxSolenoidPeriodButton = document.getElementById("oxSolenoidPeriod");
oxSolenoidPeriodButton.addEventListener("click", () => {
	console.log("time in");
	turnOnOxygen();	
	timeoutID = setTimeout(() => {
		console.log("timeout");
		turnOffOxygen();
	}, 5000);
});
let isLogging = false;
const isLoggingCheckbox = document.getElementById("islogging");
isLoggingCheckbox.addEventListener("change",() => {
	isLogging = !isLogging;
});

let selectedFilter = 'median-ema';
const filterButtons = document.querySelectorAll('.filter-button');

function setSelectedFilter(filterName) {
	selectedFilter = filterName;
	filterButtons.forEach((button) => {
		button.classList.toggle('active', button.dataset.filter === filterName);
	});
}

filterButtons.forEach((button) => {
	button.addEventListener('click', () => {
		setSelectedFilter(button.dataset.filter);
	});
});

// Main execution (we could put it in a function, but idk what to call it (this is me attempting to be funny))

let counter = 0;
let isCalibrated = false;
const num_calibration_samples = 100;
let calibrationSamplesReceived = num_calibration_samples;

const baseline_psi = 14.671;
let phase = 0; // on phase 2 we take median of samples and then go back to phase 0
const num_samples = 3;
let calibrationBuffer = Array(num_graphs).fill(baseline_psi);
let medianBuffer = Array(num_graphs);
const freqWindowSize = 16;
const freqCutoffBin = 3;
let frequencyBuffer = Array(num_graphs);

for (let i = 0; i < num_graphs; i++) {
	medianBuffer[i] = new Array(num_samples).fill(0);
	frequencyBuffer[i] = new Array(freqWindowSize).fill(0);
}

function frequencyDomainLowPass(signalWindow, cutoffBin) {
	const n = signalWindow.length;
	let re = new Array(n).fill(0);
	let im = new Array(n).fill(0);

	for (let k = 0; k < n; k++) {
		for (let t = 0; t < n; t++) {
			const angle = (2 * Math.PI * k * t) / n;
			re[k] += signalWindow[t] * Math.cos(angle);
			im[k] -= signalWindow[t] * Math.sin(angle);
		}
	}

	for (let k = 0; k < n; k++) {
		const mirror = n - k;
		if (k > cutoffBin && mirror > cutoffBin) {
			re[k] = 0;
			im[k] = 0;
		}
	}

	let filtered = new Array(n).fill(0);
	for (let t = 0; t < n; t++) {
		let value = 0;
		for (let k = 0; k < n; k++) {
			const angle = (2 * Math.PI * k * t) / n;
			value += re[k] * Math.cos(angle) - im[k] * Math.sin(angle);
		}
		filtered[t] = value / n;
	}

	return filtered[n - 1];
}

window.electronAPI.onSerialPacket((packet) => {
	
	alpha = 0.6;
	let csvValues = [];

	for (let i = 0; i < num_graphs; i++) {
		const current = graphs[i].interpFn(packet[2*i] + ((packet[2*i+1]) << 8));
		const rawValue = current - calibrationBuffer[i] + baseline_psi;
		frequencyBuffer[i].shift();
		frequencyBuffer[i].push(rawValue);

		medianBuffer[i][phase] = rawValue;
		const sortedSamples = [...medianBuffer[i]].sort((a, b) => a - b);
		const medianValue = sortedSamples[(num_samples - 1) / 2];

		let value = rawValue;
		if (selectedFilter === 'ema') {
			value = alpha * rawValue + (1 - alpha) * prevArray[i];
		} else if (selectedFilter === 'median') {
			value = medianValue;
		} else if (selectedFilter === 'median-ema') {
			value = alpha * medianValue + (1 - alpha) * prevArray[i];
		} else if (selectedFilter === 'freq') {
			value = frequencyDomainLowPass(frequencyBuffer[i], freqCutoffBin);
		}

		graphs[i].addPoint(counter, value);
		prevArray[i] = value;
		csvValues.push(value.toFixed(3));
	}

	phase = (phase + 1) % num_samples;
	counter++;

	// 	// append to csv line
	// 	csvline += (i == 0 ? '' : ', ') + value.toFixed(3);
		
	// 	// compute calibration offset
	// 	//console.log(calibrationSamplesReceived);
	// 	// if (calibrationSamplesReceived < num_calibration_samples) {
	// 	// 	calibrationBuffer[i] += current;
	// 	// 	if (calibrationSamplesReceived + 1 == num_calibration_samples) {
	// 	// 		calibrationBuffer[i] = calibrationBuffer[i] / num_calibration_samples;
	// 	// 	}
	// 	// }

	// 	//else {
	// 		// delta = calibrationBuffer[i] - baseline_psi;
	// 		// //console.log(delta);
	// 		// value = ((1-alpha) * current + alpha * prevArray[i]);
	// 		// graphs[i].addPoint(counter, value);
	// 		// prevArray[i] = value;

	// 		// // append to csv line
	// 		// if (csvline == '') {
	// 		//   csvline = csvline + value.toFixed(3);
	// 		// }
	// 		// else {
	// 		// 	csvline = csvline + ', ' + String(value);
	// 		// }

	// 	//}
	// 	//if (current < 0) current = 0;
	
	// }
	// log only if we weren't calibrating
	
	if (isLogging) {
		const csvline = csvValues.join(', ') + ', ' + String(controlState) + '\n';
		window.electronAPI.writeCSV(csvline);
	}
	
	calibrationSamplesReceived += 1;
})
