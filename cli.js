#!/usr/bin/env nodejs
var zsync = require('./lib/zsync');
var debug = require('./lib/debug');
var readjsonSync = require('./lib/read-json-sync');
var prog = require('commander');
var table = require('text-table');
var extend = require('extend');
var lockFile = require('lockfile');
var join = require('path').join;
var slice = Function.prototype.call.bind(Array.prototype.slice);

var config = readjsonSync(join(process.env.HOME, '.zsync.json'))
	|| readjsonSync(join('/etc/', 'zsync.json'))
	|| {}
	;

var LOCK_PATH = process.env.LOCK_PATH || '/var/lock/';
var LOCK_WAIT = process.env.LOCK_WAIT || 5000;

prog.command('list [glob/preset]')
	.description('list file systems')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')
	
	.option('-t, --type [type]', 'filter file system types')
	.option('-g, --glob [glob]', 'dataset-glob search glob')
	.option('-x, --exclude [glob]', 'exclude datasets by glob, comma separated')
	.option('-R, --recursive', 'recursive fs lookup')
	
	.option('-s, --source [dataset]', 'fs/vol name')
	.option('-S, --source-host [host]', 'host on which the source dataset resides')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')

	.action(list)

prog.command('status [glob/preset] [destination] [destination-host]')
	.description( 'get the sync status between a source dataset and destination dataset')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-t, --type [type]', 'filter file system types')
	.option('-g, --glob [glob]', 'dataset-glob search glob')
	.option('-x, --exclude [glob]', 'exclude datasets by glob, comma separated')
 	.option('-R, --recursive', 'Send all fileystems/volumes in source-dataset')
	
	.option('-s, --source [dataset]', 'source-dataset, eg: pool/vol1, pool')
	.option('-S, --source-host [host]', 'host on which the source dataset resides')
	
	.option('-d, --destination [name]', 'destination-base, eg: pool2/virtual-disks, pool2')
	.option('-D, --destination-host [host]', 'host on which the destination dataset resides')
	.option('-n, --destination-drop [number]', '[number] of elements to drop from the left side of [source-dataset].')
	.option('-N, --destination-keep [number]', '[number] of elements to keep from the right side of [source-dataset]')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	.action(status)

prog.command('push [glob/preset] [destination] [destination-host]')
	.description( 'push a local dataset to another dataset optionally on a remote host')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-t, --type [type]', 'filter file system types')
	.option('-g, --glob [glob]', 'dataset-glob search glob')
	.option('-x, --exclude [glob]', 'exclude datasets by glob, comma separated')
 	.option('-R, --recursive', 'Send all fileystems/volumes in source-dataset')
	
	.option('-s, --source [source-dataset]', 'source-dataset, eg: pool/vol1, pool')
	.option('-S, --source-host [source-host]', 'host on which the source dataset resides')
	
	.option('-d, --destination [name]', 'destination-base, eg: pool2/virtual-disks, pool2')
	.option('-D, --destination-host [host]', 'host on which the destination dataset resides')
	.option('-n, --destination-drop [number]', '[number] of elements to drop from the left side of [source-dataset].')
	.option('-N, --destination-keep [number]', '[number] of elements to keep from the right side of [source-dataset]')
	
	.option('-F, --force', 'force receive (may cause rollback)')
	.option('-r, --replication', 'enable a replication stream')
	.option('-c, --continue', 'continue on to the next dataset if errors are encountered')
	.option('-X, --fallback-destroy-destination', 'if destination dataset exists and there is no common snapshot, then destroy the remote dataset before send.')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	.action(push)

prog.command('snapshot [glob/preset] [tag] [dateformat]')
	.description( 'create snapshots on datasets matching a glob using an optional tag')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-t, --type [type]', 'filter file system types')
	.option('-g, --glob [glob]', 'dataset-glob search glob')
	.option('-x, --exclude [glob]', 'exclude datasets by glob, comma separated')
 	.option('-R, --recursive', 'Send all fileystems/volumes in source-dataset')
	
	.option('-s, --source [source-dataset]', 'source-dataset, eg: pool/vol1, pool')
	.option('-S, --source-host [source-host]', 'host on which the source dataset resides')
	
	.option('-p, --snapshot [name]', 'exact snapshot name to use')
	.option('-t, --tag [name]', 'tag name for snapshot')
	.option('-T, --date-format [dateformat]', 'date format - see https://www.npmjs.com/package/dateformat. default: yyyymmddHHMMssl')
	.option('-a, --atomic', 'create all possible snapshots atomically')
	.option('-c, --continue', 'continue on to the next dataset if errors are encountered')

	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	.action(snap)

prog.command('rotate [glob/preset] [tag] [keep] [destination] [destination-host]')
	.description( 'rotate snapshots keeping a certain number')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-t, --type [type]', 'filter file system types')
	.option('-g, --glob [glob]', 'dataset-glob search glob')
	.option('-x, --exclude [glob]', 'exclude datasets by glob, comma separated')
 	.option('-R, --recursive', 'Send all fileystems/volumes in source-dataset')
	
	.option('-s, --source [source-dataset]', 'source-dataset, eg: pool/vol1, pool')
	.option('-S, --source-host [source-host]', 'host on which the source dataset resides')
	
	.option('-K, --keep [number]', 'number of snapshots to keep')
	.option('-p, --snapshot [name]', 'exact snapshot name to remove')
	.option('-t, --tag [name]', 'tag name to process for rotation')
	.option('-c, --continue', 'continue on to the next dataset if errors are encountered')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	.action(rotate)

prog.command('destroy [source] [source-host]')
	.description( 'destroy dataset identified by source optionally on remote source-host')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-R, --recursive', 'Send all fileystems/volumes in source-dataset')
	
	.option('-s, --source [source-dataset]', 'source-dataset, eg: pool/vol1, pool')
	.option('-S, --source-host [source-host]', 'host on which the source dataset resides')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	.action(destroy)

prog.command('receive [dataset]')
	.description( 'receive a dataset via stdin')
	.option('-u, --user [user]', 'remote ssh user')
	.option('-k, --key [key]', 'path to ssh private key')

	.option('-F, --force', 'force receive (may cause rollback)')
	.option('-d, --destination [dataset]', 'destination-base, eg: pool2/virtual-disks, pool2')
	
	.option('-f, --format [format]', 'output format (json?)')
	.option('-v, --verbose', 'verbose output')
	.option('-V, --debug', 'enable debug output.')
	
	.action(receive)

prog.parse(process.argv);

if (!process.argv.slice(2).length) {
	prog.outputHelp();
}

function list(glob) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'list';
	
	//for some reason, sometimes commander is passing "true" as the glob
	//that's not what we want
	opts.glob = (typeof glob === 'string' && glob !== 'true') ? glob : opts.glob;

	opts = extend(true, opts, config[glob] || {});
	
	if (opts.debug) {
		debug.enable('zsync');
	}
	
	run(opts, function (err, list) {
		if (err) {
			console.error(err.message);
			
			process.exit(1);
		}

		list.forEach(function (dataset) {
			console.log('%s', dataset.name);
		});
	});
}

function status(glob, destination, destinationHost) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'status';
	opts.destination = opts.destination || destination;
	opts.destinationHost = opts.destinationHost || destinationHost;
	
	//for some reason, sometimes commander is passing "true" as the glob
	//that's not what we want
	opts.glob = (typeof glob === 'string' && glob !== 'true') ? glob : opts.glob;

	opts = extend(true, opts, config[glob] || {});
	
	if (opts.debug) {
		debug.enable('zsync');
	}
	
	run(opts, function (err, result) {
		if (err) {
			console.log(err.message);
			
			process.exit(1);
		}
		
		var data = result.map(function (dataset) {
			return [
				dataset.source || ''
				, dataset.destination || ''
				, dataset.destinationHost || 'local'
				, !dataset.work || false
				, dataset.fromSnap || ''
			];
		});
		
		data.unshift([
			'source'
			, 'destination'
			, 'destination-host'
			, 'up-to-date'
			, 'latest-snap-shot'
		]);
		
		var t = table(data);
		
		console.log(t);
	});
}

function push(glob, destination, destinationHost) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	var lockPath = join(LOCK_PATH, 'zsync-push.lock');
	
	opts.command = 'push';
	opts.destination = opts.destination || destination;
	opts.destinationHost = opts.destinationHost || destinationHost;
	
	//for some reason, sometimes commander is passing "true" as the glob
	//that's not what we want
	opts.glob = (typeof glob === 'string' && glob !== 'true') ? glob : opts.glob;
	
	opts = extend(true, opts, config[glob] || {});
	
	if (opts.debug) {
		debug.enable('zsync');
	}
	
	lockFile.lock(lockPath, { wait : LOCK_WAIT }, function (err) {
		if (err) {
			console.log('Error obtaining lock: ', err.message);
			
			process.exit(2);
		}
		
		run(opts, function (err, result) {
			if (err) {
				console.log('Error running push commmand:', err.message);
				
				process.exit(1);
			}
			
			lockFile.unlock(lockPath, function (err) {
				console.log('done');
			});
		});
	
	})
}

function snap(glob, tag, dateFormat) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'snap';
	
	//for some reason, sometimes commander is passing "true" as the glob
	//that's not what we want
	opts.glob = (typeof glob === 'string' && glob !== 'true') ? glob : opts.glob;
	opts.tag = (typeof tag === 'string' && tag !== 'true') ? tag : opts.tag;
	opts.dateFormat = (typeof dateFormat === 'string' && dateFormat !== 'true') ? dateFormat : opts.dateFormat;
	
	opts = extend(true, opts, config[glob] || {});
	
	if (opts.debug) {
		debug.enable('zsync');
	}
	
	run(opts, function (err, result) {
		if (err) {
			console.log('Error running snapshot commmand:', err.message);
			
			process.exit(1);
		}

		console.log('done');
	});
}

function rotate(glob, tag, keep) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'rotate';
	
	//for some reason, sometimes commander is passing "true" as the glob
	//that's not what we want
	opts.glob = (typeof glob === 'string' && glob !== 'true') ? glob : opts.glob;
	opts.tag = (typeof tag === 'string' && tag !== 'true') ? tag : opts.tag;
	opts.keep = (typeof keep === 'string' && keep !== 'true') ? keep : opts.keep;
	
	opts = extend(true, opts, config[glob] || {});
	
	if (opts.debug) {
		debug.enable('zsync');
	}
	
	run(opts, function (err, result) {
		if (err) {
			console.log('Error running rotate commmand:', err.message);
			
			process.exit(1);
		}

		console.log('done');
	});
}

function receive(destination) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'receive';
	opts.destination = opts.destination || destination;
	opts.stream = process.stdin;

	if (opts.debug) {
		process.env.DEBUG = 'zsync';
	}
	
	run(opts, function (err, result) {
		if (err) {
			console.error(err.message);

			return process.exit(1);
		}
		
		console.error('receive ended');
		console.error(err);
		console.error(result);
	});
}

function destroy(destination, destinationHost) {
	var opts = parseOpts(arguments[arguments.length - 1]);
	
	opts.command = 'destroy';
	opts.destination = opts.destination || destination;
	opts.destinationHost = opts.destinationHost || destinationHost;

	if (opts.debug) {
		process.env.DEBUG = 'zsync';
	}
	
	run(opts, function (err, result) {
		if (err) {
			console.error(err.message);

			return process.exit(1);
		}
	});
}

function parseOpts(opts) {
	var obj = {};
	var avoid = ['parent', 'options', 'commands'];

	if (!opts) {
		return obj;
	}

	Object.keys(opts).forEach(function (opt) {
		if (/^_/.test(opt) || ~avoid.indexOf(opt)) {
			return;
		}

		obj[opt] = opts[opt];
	});

	return obj;
}

function run(opts, cb) {
	var format = opts.format;

	if (opts.remote) {
		opts.format = opts.hasOwnProperty('format') ? opts.format : 'json';
	}

	fn = zsync[opts.command];

	if (format === 'json') {
		//if the requested format is JSON then we just
		//execute the requested function and output the returned
		//arguments as JSON. We don't call the callback
		return fn(opts, function (err) {
			var args = slice(arguments);

			//apparently errors don't convert to JSON nicely
			//fix 'em up as normal objects
			if (err) {
				args[0] = { message : err.message };

				Object.keys(err).forEach(function (key) {
					args[0][key] = err[key];
				});
			}

			return process.stdout.write(JSON.stringify(args));
		});
	}
	//else

	fn(opts, cb);
}
