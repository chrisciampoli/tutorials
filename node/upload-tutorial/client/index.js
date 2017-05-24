import LivelyUpload from '@livelyvideo/upload';
import StockPlayer from '@livelyvideo/stock-vod-player';
import xhr from 'xhr';
import text from 'text-content';

/**
Set up the upload instance

Params:
	- html element
	- options
		{object} el - The DOM element for Chat to be constructed on
		{Config} [options] - Configurable options for the Chat class
		{string} options.host - host of upload route
		{string} options.authUrl - authUrl to connect to
		{string} [options.token] - Manual token for authorization
		{string} [options.redirect] - Redirect url for legacy support
		{string} [options.accept] - Accept field for upload accept attribute
		{string} [options.bemPrefix=upload] - Prefix for DOM classes
		{string} [options.autoSubmit=true] - Auto submit upload on select
		{string} [options.pause=false] - Render pause button
		{string} [options.cancel=false] - Render cancel button
		{string} [options.messages] - Hard code message strings
		{number} [options.chunkSize=102400] - Size of chunks to be uploaded
		{number} [options.chunkConnections=3] - Number of concurrent chunk connections
**/
const upload = new LivelyUpload(document.querySelector('.upload'), {
	authUrl: '/access-token',
	host: 'dev.livelyvideo.tv'
});
window.upload = upload;

// Play a video
/**
Function to load the stock player, triggered later by a click event on <a> tags generated by the "get listings" button

Params:
	- html element
	- manifest url, returned by the listings endpoint located in server.js
	- player options
		> autoplay: [true] autoplays the stream when it loads
		> bitrate: [undefined] null for adaptive when available, desired kbps otherwise
		> drivers: ["mp4", "nativeHls", "jsHls", "flash", lodef"] driver priority
		> debug: [false] enables debug logging
		> recoverErrorCount: [10] Playback error count to recover the entire driver on
		> forceDrivers:	[false]
		> muted: whether or not the driver is muted
		> pollingInterval: [10000] ms timeout to wait before polling again
		> volume: [0.75] 0-1 volume
	- controls options
		> popout: popout options
		> popout[].url: url for popout
		> popout[].width: width for popout in px
		> popout[].height: height for popout in px

Events:
	- error emitted with all errors
	- exit-fullscreen
	- enter-fullscreen
	- bitrate-switch
	- select-driver
	- manifest
	- play
	- stop
	- pause
	- stall
	- progress
	- timeupdate
	- mute
	- unmute
	- volume
	- online
	- offline
	- estimated-bw
	- user-active
	- user-idle
**/
let stockPlayer;
function loadPlayer (manifest) {
	return (e) => {
		e.preventDefault();
		if (stockPlayer) {
			stockPlayer.destroy();
		}

		window.stockPlayer = stockPlayer = new StockPlayer(document.querySelector('#player'), manifest, {
			drivers: ['hlsjs', 'hls', 'flashHls', 'mp4'],
			hlsjsPath: 'https://cdn.jsdelivr.net/hls.js/latest/hls.min.js',
			flashlsPath: './flashlsChromeless.swf',
		});
	};
}

// Videos
const videosContainer = document.querySelector('.videos');


function loadVideos() {
	xhr({
		method: 'GET',
		uri: '/videos',
		json: true
	}, (err, response, body) => {
		if (err) {
			console.error('get videos error', err);
			return;
		}

		if (response.statusCode > 399) {
			console.error('get videos error', {
				code: response.statusCode,
				body
			})
			return;
		}

		while (videosContainer.children.length) {
			videosContainer.children[0].remove();
		}

		for (let i = 0; i < body.results.length; i++) {
			const videoEntry = document.createElement('div');
			const videoLink = document.createElement('a');
			videoLink.setAttribute('href', '#');
			videoEntry.appendChild(videoLink);

			videoLink.onclick = loadPlayer(body.results[i].manifest);
			text(videoLink, `video uploaded by ${body.results[i].userId} on ${body.results[i].dateEnd}`);
			videosContainer.appendChild(videoEntry);
		}
	});
}

const loadVideosButton = document.querySelector('.loadvideos');
loadVideosButton.onclick = () => {
	loadVideos();
};
loadVideos();
