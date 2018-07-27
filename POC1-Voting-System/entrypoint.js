var shell = require('shelljs');

var nodeIPs = process.env.NODE_IPS;
var address = process.env.ADDRESS;
var newIPs = '';

for (var index = 0; index < nodeIPs.split(",").length; index++) {
  newIPs += '\'http://' + nodeIPs.split(",")[index] + '\'';
  if (index != nodeIPs.split(",").length - 1) newIPs += ',';
}

shell.sed('-i', '<NODE_IPS>', '[' + newIPs + ']', 'routes/index.js');
shell.sed('-i', '<ADDRESS>', '\'' + address + '\'', 'routes/index.js');
shell.exec('npm start')