const express = require('express')

const { createServer } = require("http");
const cookieParser = require('cookie-parser')
const db = require('./models')
const userRoutes = require('./routes/userRoutes')
// const ip = require('ip');
// const host = ip.address();
const cors = require('cors');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

//setting up your port
const port = process.env.PORT
//assigning the variable app to express

const app = express()

//middleware
app.use(express.json())



app.use(cors());


app.use(cookieParser())

// console.log(`${hosts}`)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

db.sequelize.sync().then(() => {
})

app.use('/api', userRoutes)
const server = createServer(app);

//listening to server connection


// server.listen(port, 'localhost',function (error) {
//   if (error) console.log("Error in server setup");
//   console.log(`Server is listening on http://${host}:${port}`);
// })

server.listen(5000, '127.0.0.1');
server.on('listening', function() {
    console.log('Express server started on port %s at %s', server.address().port, server.address().address);
});

server.on('error', function(error) {
  console.log("Error in server setup");
});

app.on('close', function () {
  db.sequelize.close();
})

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
  var index = fs.readFileSync('index.html', 'utf8');
  res.writeHead(200, { 'Content-Type': 'html' });
  res.end(index);
});