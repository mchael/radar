window.onload = main;

// front webcam is for primarily up and down (so we can cut out extra data and only focus on up down motions) + confirming motion left right
// known issue: weird happenings on phones sometimes where it cannot connect? over local network
// todo: normalize and smooth data, remove noise, add improved heuristics
// maybe try hsl colorspace comparison (so can ignore white balance differences?)

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

function main() {
	// normalize across browsers
	// also this is the old api
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	window.URL.createObjectURL = window.URL.createObjectURL || window.webkitURL.createObjectURL;

	var xdisplay = document.getElementById('x');
	var ydisplay = document.getElementById('y');

	var fps = 16;
	var aspectRatio = 4/3;
	// var video = document.createElement('video');
	var video = document.getElementById('video');
	// video.width = 360;
	video.width = 360;
	video.height = video.width / aspectRatio;

	// var canvas = document.getElementById('canvas');
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	// context.imageSmoothingEnabled = false;
	canvas.width = 120;
	canvas.height = canvas.width / aspectRatio;

	var visibleCanvas = document.getElementById('canvas');
	visibleCanvas.context = visibleCanvas.getContext('2d');
	// fixes a scaling issue
	// http://stackoverflow.com/questions/7615009/disable-interpolation-when-scaling-a-canvas
	// visibleCanvas.context.imageSmoothingEnabled = visibleCanvas.context.webkitImageSmoothingEnabled || visibleCanvas.context.mozImageSmoothingEnabled;
	// visibleCanvas.context.imageSmoothingEnabled = false; // doesn't seem to work?
	visibleCanvas.width = video.width;
	visibleCanvas.height = video.height;
	var visibleCanvasScalingFactor = visibleCanvas.width / canvas.width;
	visibleCanvas.context.scale(visibleCanvasScalingFactor, visibleCanvasScalingFactor);

	if (navigator.getUserMedia) {
		navigator.getUserMedia({video: true}, function(stream) {
			video.src = window.URL.createObjectURL(stream);
			video.play();
		}, function () { // error
			console.error('video error!');
		});
	}
	else {
		console.error('no user media, use chrome');
	}

	video.addEventListener('loadeddata', function() {
		console.info('video loaded, bruh');
		start();
	});

	var lastFrameImageData = null;
	var xavg = 0; // canvas coords
	var yavg = 0; // inverted y
	function processVideo() {

		// things to consider:
		// when hand moves in a direction, tends to underestimate location due to detected arm movement
		// (should detect velocity to compensate), esp up and when hand is moving to other side of body
		// we can cancel noise movements by checking a plane of motion using the phone camera

		var movementIndexes = [];

		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		var thisFrameImageData = context.getImageData(0, 0, canvas.width, canvas.height);

		if (lastFrameImageData === null) {
			lastFrameImageData = thisFrameImageData;
		}
		var processedImageData = context.createImageData(thisFrameImageData);

		var intermediate // before noise is filtered;
		for (var i = 0; i < thisFrameImageData.data.length; i += 4) {
			// canvas image data is ordered "r, g, b, a" in a clamped byte array
			if (getPixelDistance(thisFrameImageData, lastFrameImageData) > 0.1) {
				var index = i / 4;
				movementIndexes.push(index);

				processedImageData.data[i] = 0;
				processedImageData.data[i + 1] = 0;
				processedImageData.data[i + 2] = 0;

				// processedImageData.data[i] = thisFrameImageData.data[i];
				// processedImageData.data[i + 1] = thisFrameImageData.data[i + 1];
				// processedImageData.data[i + 2] = thisFrameImageData.data[i + 2];
				processedImageData.data[i + 3] = 255;
			}
		}

		context.putImageData(processedImageData, 0, 0);

		var coverage = movementIndexes.length / (thisFrameImageData.data.length / 4);
		if (coverage > 0.01 &&  coverage < 0.5) {

			// console.log(movementIndexes);
			var xsum = 0;
			var ysum = 0;
			for (var i = 0; i < movementIndexes.length; i++) {
				var coords = indexToCoordinates(movementIndexes[i], canvas.width);
				xsum += coords.x;
				ysum += coords.y;
			}

			xavg = xsum / movementIndexes.length; // later: make it so little change will be a smooth movement (interpolation)
			yavg = ysum / movementIndexes.length;
			xdisplay.innerHTML = Math.round(xavg);
			ydisplay.innerHTML = Math.round(yavg);

			context.fillStyle="#00FF00";
			context.beginPath();
			context.arc(xavg, yavg, 3, 0, 2*Math.PI);
			context.fill();
			context.stroke();
			context.closePath();
		}
		else {
			context.fillStyle="#FF0000";
			context.beginPath();
			context.arc(xavg, yavg, 3, 0, 2*Math.PI);
			context.fill();
			context.stroke();
			context.closePath();
		}

		lastFrameImageData = thisFrameImageData;

		function getPixelDistance(one, two) {
			var rdiff = one.data[i] - two.data[i];
			var gdiff = one.data[i + 1] - two.data[i + 1];
			var bdiff = one.data[i + 2] - two.data[i + 2];

			var dist = Math.floor(Math.sqrt(Math.pow(rdiff, 2) + Math.pow(gdiff, 2) + Math.pow(bdiff, 2)));
			return dist / 441;
		}
	}

	function indexToCoordinates(index, width) { // remember that the index is r g b a!!! fix this function
		var y = Math.floor(index / width);
		var x = index - (y * width);
		return {
			x: x,
			y: y
		};
	}

	function coordsToIndex(x, y, width) { // once again, remember that the index is r g b a!
		var index = y + width + x;
		return index;
	}

	function start() {
		window.requestAnimationFrame(step);
	}

	function updateVisibleCanvas() {
		visibleCanvas.context.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
		visibleCanvas.context.drawImage(canvas, 0, 0, visibleCanvas.width / visibleCanvasScalingFactor, visibleCanvas.height / visibleCanvasScalingFactor);
	}

	function step() {
		setTimeout(function() {

			processVideo();
			updateVisibleCanvas();

			window.requestAnimationFrame(step);
		}, 1000 / fps);
	}

}
