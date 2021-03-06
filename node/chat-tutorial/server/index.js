// polyfills
fetch = require('node-fetch-polyfill');
WebSocket = require('ws');

const express = require('express');
const router = module.exports = express.Router();
const request = require('request');
const path = require('path');
const moment = require('moment');

const ChatCore = require('@livelyvideo/chat-core/lib/source');

const ROOM_NAME = 'demo';
const OWNER = {
	id: 'demo_owner_id',
	username: 'demo_owner'
};

const BOT = {
	id: 'demo_bot_id',
	username: 'demo_bot'
};

const useBot = process.argv.indexOf('-b') > -1 || process.argv.indexOf('--with-bot') > -1;

function getAccessToken(res, username) {
	request({
		uri: 'https://dev.livelyvideo.tv/auth/v1/access-tokens',
		method: 'POST',
		rejectUnauthorized: false,
		requestCert: true,
		headers: {
			Authorization: 'Bearer something-i-can-type'
		},
		json: {
			expire: moment.utc().add(1, 'days').format(),
			scopes: ['chat'],
			userId: `${username}_id`,
			chatUser: {
				avatar: null,
				username: username
			}
		}
	}, (err, response, body) => {
		if (err) {
			res.status(500).send('internal server error')
			return;
		}
		res.status(response.statusCode).send(body);
	});
}

router.get('/access-token', (req, res) => {
	// this request creates an access token
	// access tokens are paired with user and grant access for that user to specific scopes
	// access tokens are intended to be used directly by users on clients in cookies or auth headers
	getAccessToken(res, req.query.username);
});

router.get('/access-token-bot', (req, res) => {
	// this request creates an access token for the bot
	getAccessToken(res, BOT.username);
});

function createRoomIfNotExists() {
	// this function creates a room, or updates it if exists

	// create the owner user if they do not exist
	request({
		method: 'POST',
		uri: 'https://dev.livelyvideo.tv/chat/private/v1/users',
		rejectUnauthorized: false,
		requestCert: true,
		headers: {
			Authorization: 'Bearer something-i-can-type'
		},
		json: {
			id: OWNER.id,
			username: OWNER.username
		}
	}, (err, response, body) => {
		if (err) {
			console.error('user not created', err);
			process.exit(1);
		}
		if (response.statusCode > 399) {
			console.error('user not created', {
				code: response.statusCode,
				error: JSON.stringify(body, null, '  ')
			});
			process.exit(1);
		}

		// the name of the room cannot change, the title will be displayed in the UI
		request({
			method: 'POST',
			uri: 'https://dev.livelyvideo.tv/chat/private/v1/rooms',
			rejectUnauthorized: false,
			requestCert: true,
			headers: {
				Authorization: 'Bearer something-i-can-type'
			},
			json: {
				owner: OWNER.id,
				name: ROOM_NAME,
				title: 'Test Room'
			}
		}, (err, response, body) => {
			if (err) {
				console.error('room not created');
				process.exit(1);
			}
			if (response.statusCode > 399) {
				console.error('room not created', {
					code: response.statusCode,
					error: body
				});
				process.exit(1);
			}

			if (useBot) {
				runBot();
			}
		});
	});
}

function runBot() {
	request({
		method: 'POST',
		uri: 'https://dev.livelyvideo.tv/chat/private/v1/users',
		rejectUnauthorized: false,
		requestCert: true,
		headers: {
			Authorization: 'Bearer something-i-can-type'
		},
		json: {
			id: BOT.id,
			username: BOT.username
		}
	}, (err, response, body) => {
		if (err) {
			console.error('bot not created', err);
			process.exit(1);
		}
		if (response.statusCode > 399) {
			console.error('bot not created', {
				code: response.statusCode,
				error: JSON.stringify(body, null, '  ')
			});
			process.exit(1);
		}
		
		const port = process.env.PORT || 7000;
		const chat = new ChatCore({
			room: ROOM_NAME,
			host: 'dev.livelyvideo.tv',
		}, {
			url: `http://localhost:${port}/access-token-bot`
		});

		chat.on('chat', (data) => {
			if (data.message.indexOf("bot") > 0) {
				chat.command('Did someone mention my name?');
			}
		})
	});
}
createRoomIfNotExists();

// serve dist as static files
router.use('/', express.static(path.join(__dirname, '..', 'dist')));
