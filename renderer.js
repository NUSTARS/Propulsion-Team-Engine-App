// renderer.js
//
// controls rendering processes
// or something like that

// constant holding the division where the canvases are stored
const canvasDiv = document.getElementById('canvas-division');
canvasDiv.style.height = '200px';

const switchDiv = document.getElementById('switch-division');

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
		this.currentData.textContent = y.toString();
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

solenoid1 = new BinaryActuator("Ox Solenoid:", 0, 0)
solenoid2 = new BinaryActuator("Ethanol Solenoid:", 0, 1)
servo1 = new BinaryActuator("Nitrogen Purge:", 0, 2)
servo2 = new BinaryActuator("Nitrogen In:", 0, 3)
sparkPlug = new BinaryActuator("Spark Plug:", 0, 4)




// Main execution (we could put it in a function, but idk what to call it (this is me attempting to be funny))

let counter = 0;
let phase = 0; // on phase 2 we take median of samples and then go back to phase 0
const num_samples = 3;
let medianBuffer = Array(num_samples);
for (let i = 0; i < num_graphs; i++) {
  medianBuffer[i] = new Array(num_graphs).fill(0);
}

window.electronAPI.onSerialPacket((packet) => {
	
	alpha = 0.9;
	/*
	for (let i = 0; i < num_graphs; i++) {
		medianBuffer[phase][i] = graphs[i].interpFn(packet[2*i] + ((packet[2*i+1]) << 8));
		// only proceed if we have num_samples_samples
		if (phase != num_samples - 1) {continue};
		// compute median
		medianBuffer[phase].sort();
		let median = medianBuffer[phase][(num_samples-1)/2];
		value = (1-alpha) * median + alpha * prevArray[i];
		graphs[i].addPoint(counter,value);
		prevArray[i] = value;
		
	}
	
	phase = (phase + 1) % num_samples;
	if (phase == 0) {
		counter += 1;
	}*/
	
	
	for (let i = 0; i < num_graphs; i++) {
		current = graphs[i].interpFn(packet[2*i] + ((packet[2*i+1]) << 8)); //this may be backwards
		//if (current < 0) current = 0;
		value = (1-alpha) * current + alpha * prevArray[i];
		graphs[i].addPoint(counter, value);
		prevArray[i] = value;
	}
	

	counter += 1;
	
})





