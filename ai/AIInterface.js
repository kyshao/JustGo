var http = require("http");
var options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/ai/attackEnemy',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
  }
};

const paths = ['/ai/maxlibs', '/ai/attackEnemy', '/ai/formEyes'];

/**
 * Post request to AI Server
 * 
 * @param postData should be in the format: 
    { board: [[1,0,0],[0,0,0],[0,0,0]],
      size: 3,
      last: {x:0, y:0, pass : false, c : 1} };
 *   
 * @param callback is executed when the AI returns a move
 */
function query(postData, callback) {
    var randomIndex = Math.floor(Math.random() * (paths.length - 1));
    options.path = paths[randomIndex];

    var req = http.request(options, function(res) {
      debugger;
      res.on('data', callback);
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.write(JSON.stringify(postData));
    req.end();
}

module.exports = {
  query : query
}