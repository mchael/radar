window.onload = main;

function main() {
	// normalize across browsers
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	window.URL.createObjectURL = window.URL.createObjectURL || window.webkitURL.createObjectURL;

	var fps = 10;
	var aspectRatio = 4/3;
	// var video = document.createElement('video');
	var video = document.getElementById('video');
	// video.width = 360;
	video.width = 360;
	video.height = video.width / aspectRatio;

	var canvas = document.getElementById('canvas');
	canvas.width = video.width;
	canvas.height = video.height;

	var context = canvas.getContext('2d');

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
		console.log('video loaded, bruh');
		start();
	});

	var lastFrameImageData = null;

	function processVideo() {
		var movementIndexes = [];

		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		var thisFrameImageData = context.getImageData(0, 0, canvas.width, canvas.height);

		if (lastFrameImageData === null) {
			lastFrameImageData = thisFrameImageData;
		}
		var processedImageData = context.createImageData(thisFrameImageData);

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

		if (movementIndexes.length > 0) {

			console.log(movementIndexes);
			var xsum = 0;
			var ysum = 0;
			for (var i = 0; i < movementIndexes.length; i++) {
				var coords = indexToCoordinates(movementIndexes[i], video.width);
				xsum += coords.x;
				ysum += coords.y;
			}

			var xavg = xsum / movementIndexes.length;
			var yavg = ysum / movementIndexes.length;

			console.log(xsum);

			context.fillStyle="#FF0000";
			context.beginPath();
			context.arc(xavg , yavg, 5, 0, 2*Math.PI);
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

	function step() {
		setTimeout(function() {

			processVideo();

			window.requestAnimationFrame(step);
		}, 1000 / fps);
	}

}
