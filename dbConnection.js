const mysql = require('mysql2');

const dbConfig = {
  host: '194.238.17.75',
  user: 'disendra',
  password: 'Bl@ckp0ny@24',
  database: 'avdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Attempt to handle connection loss and reconnect
pool.on('connection', function (connection) {
  console.log('New connection established');

  connection.on('error', function (err) {
    console.error('MySQL error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Attempting to reconnect...');
      // Remove the current connection from the pool
      pool.removeConnection(connection);
      // Create a new connection and add it to the pool
      const newConnection = mysql.createConnection(dbConfig);
      pool.addConnection(newConnection);
      // Retry the query on the new connection
      newConnection.connect(function (error) {
        if (error) {
          console.error('Failed to reconnect:', error);
        } else {
          console.log('Reconnected successfully');
        }
      });
    } else {
      throw err;
    }
  });
});

module.exports = pool;


// // const db = mysql.createConnection({
// //   host: 'localhost',
// //   user: 'root',
// //   password: 'Softsol@321',
// //   database: 'javadb'
// // });


// db.connect((err) => {
//   if (err) {
//     throw err;
//   }
//   console.log('Connected to the MySQL database');
// });


// module.exports = db;





// let db = mysql.createConnection({
//   host: 'b80vvfgdi6efpgtfiznc-mysql.services.clever-cloud.com',
//   user: 'uykl1sm13wtl0tsu',
//   password: 'Yp6KGBD5CG8aaQL44cD0',
//   database: 'b80vvfgdi6efpgtfiznc'
// });