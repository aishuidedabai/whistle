#! /usr/bin/env node
/*eslint no-console: "off"*/
var program = require('starting');
var path = require('path');
var os = require('os');
var config = require('../lib/config');
var colors = require('colors/safe');

function getIpList() {
  var ipList = [];
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function(ifname) {
    ifaces[ifname].forEach(function (iface) {
      if (iface.family == 'IPv4') {
        ipList.push(iface.address);
      }
    });
  });

  return ipList;
}

function error(msg) {
  console.log(colors.red(msg));
}

function warn(msg) {
  console.log(colors.yellow(msg));
}

function info(msg) {
  console.log(colors.green(msg));
}

function showUsage(isRunning, options, restart) {
  var port = options.port || config.port;
  if (isRunning) {
    warn('[!] ' + config.name + '@' + config.version + ' is running');
  } else {
    info('[i] ' + config.name + '@' + config.version + (restart ? ' restarted' : ' started'));
  }

  info('[i] First, use your device to visit the following URL list, gets the ' + colors.bold('IP') + ' of the URL you can visit:');
  info(getIpList().map(function(ip) {
    return '    http://' + colors.bold(ip) + (port ? ':' + port : '') + '/';
  }).join('\n'));

  warn('    Note: If the following URLs are unable to access, check the server\'s firewall settings');
  warn('          For more information, please visit ' + colors.bold('https://github.com/avwo/whistle'));
  info('[i] Second, configure your device to use ' + config.name + ' as its HTTP and HTTPS proxy on ' + colors.bold('IP:') + port);
  info('[i] Last, use ' + colors.bold('Chrome') + ' to visit ' + colors.bold('http://' + (options.localUIHost || config.localUIHost) + '/') + ' to get started');

  if (parseInt(process.version.slice(1), 10) < 6) {
    warn(colors.bold('\nWarning: The current Node version is too low, access https://nodejs.org to install the latest version, or may not be able to intercept HTTPS CONNECTs\n'));
  }
}

function showStartupInfo(err, options, debugMode, restart) {
  if (!err || err === true) {
    return showUsage(err, options, restart);
  }
  if (/listen EADDRINUSE/.test(err)) {
    error('[!] Failed to bind proxy port ' + (options.port || config.port) + ': The port is already in use');
    info('[i] Please check if ' + config.name + ' is already running, you can ' + (debugMode ? 'stop whistle with `w2 stop` first' : 'restart whistle with `w2 restart`'));
    info('    or if another application is using the port, you can change the port with ' + (debugMode ? '`w2 run -p newPort`\n' : '`w2 start -p newPort`\n'));
  } else if (err.code == 'EACCES' || err.code == 'EPERM') {
    error('[!] Cannot start ' + config.name + ' owned by root');
    info('[i] Try to run command with `sudo`\n');
  }

  error(err.stack ? 'Date: ' + new Date().toLocaleString() + '\n' + err.stack : err);
}

program.setConfig({
  main: function(options) {
    var hash = options && options.storage && encodeURIComponent(options.storage);
    return path.join(__dirname, '../index.js') + (hash ? '#' + hash + '#' : '');
  },
  name: config.name,
  version: config.version,
  runCallback: function(err, options) {
    if (err) {
      showStartupInfo(err, options, true);
      return;
    }
    showUsage(false, options);
    console.log('Press [Ctrl+C] to stop ' + config.name + '...');
  },
  startCallback: showStartupInfo,
  restartCallback: function(err, options) {
    showStartupInfo(err, options, false, true);
  },
  stopCallback: function(err) {
    if (err === true) {
      info('[i] ' + config.name + ' killed.');
    } else if (err) {
      if (err.code === 'EPERM') {
        error('[!] Cannot kill ' + config.name + ' owned by root');
        info('[i] Try to run command with `sudo`');
      } else {
        error('[!] ' + err.message);
      }
    } else {
      warn('[!] No running ' + config.name);
    }
  }
});

program
  .option('-D, --baseDir [baseDir]', 'the base dir of config data', String, undefined)
  .option('-A, --ATS', 'generate Root CA for iOS ATS (Node >= 6 is required)')
  .option('-z, --certDir [directory]', 'custom certificate path', String, undefined)
  .option('-l, --localUIHost [hostname]', 'local ui host (' + config.localUIHost + ' by default)', String, undefined)
  .option('-L, --pluginHost [hostname]', 'plugin ui host (as: "script=a.b.com&vase=x.y.com")', String, undefined)
  .option('-n, --username [username]', 'the username of ' + config.name, String, undefined)
  .option('-w, --password [password]', 'the password of ' + config.name, String, undefined)
  .option('-N, --guestName [username]', 'the guest name', String, undefined)
  .option('-W, --guestPassword [password]', 'the guest password', String, undefined)
  .option('-s, --sockets [number]', 'max sockets (' + config.sockets + ' by default)', parseInt, undefined)
  .option('-S, --storage [newStorageDir]', 'the new local storage directory', String, undefined)
  .option('-C, --copy [storageDir]', 'copy storageDir to newStorageDir', String, undefined)
  .option('-c, --dnsCache [time]', 'the cache time of DNS (30000ms by default)', String, undefined)
  .option('-H, --host [host]', config.name + ' listening host(:: or 0.0.0.0 by default)', String, undefined)
  .option('-p, --port [port]', config.name + ' listening port (' + config.port + ' by default)', parseInt, undefined)
  .option('-P, --uiport [uiport]', config.name + ' ui port (' + (config.port + 1) + ' by default)', parseInt, undefined)
  .option('-m, --middlewares [script path or module name]', 'express middlewares path (as: xx,yy/zz.js)', String, undefined)
  .option('-M, --mode [mode]', 'the whistle mode (as: pureProxy|debug|multiEnv)', String, undefined)
  .option('-u, --uipath [script path]', 'web ui plugin path', String, undefined)
  .option('-t, --timeout [ms]', 'request timeout (' + config.timeout + ' ms by default)', parseInt, undefined)
  .option('-e, --extra [extraData]', 'extra data for plugin', String, undefined)
  .option('-f, --secureFilter [secureFilter]', 'the script path of secure filter', String, undefined)
  .option('-R, --reqCacheSize [reqCacheSize]', 'the cache size of request data (512 by default)', String, undefined)
  .option('-F, --frameCacheSize [frameCacheSize]', 'the cache size of socket frames (512 by default)', String, undefined)
  .parse(process.argv);
