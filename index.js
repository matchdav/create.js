
/**
 * Module dependencies.
 */

var utils = require('component-consoler');
var program = require('commander');
var mkdir = require('mkdirp').sync;
var path = require('path');
var fs = require('fs');
var prompt = require('prompt');

var readme = require('./templates/readme');
var schema = require('./lib/schema');
var join = path.join;
var read = fs.readFileSync;
var readdir = fs.readdirSync;
var exists = fs.existsSync;

// usage

program.usage('[dir]');

// options

program
  .option('-l, --local', 'create a local private component')
  .parse(process.argv);

// config

var conf = {};

// dest

var dir = program.args[0] || '.';

// --local

var local = program.local;

// already a component

if (exists(join(dir, 'component.json'))) {
  utils.fatal(dir + ' is already a component');
}

/**
 * Verbose write.
 */

function write(path, str) {
  if (exists(path)) {
    utils.warn('exists', path);
  } else {
    utils.log('create', path);
    fs.writeFileSync(path, str);
  }
}

// private / public prompts

if (local) {
  var prop = {
    properties: {
      name: {
        name: 'name: ',
        required: true
      }  
    } 
  };
} else {
  var prop = {
    properties: {
      repo: {
        name: 'repo (username/project): ',
        warning: 'repo must be <username>/<project>',
        required: true
      }  
    }  
  };
}

// prompt
prompt.start();
prompt.addProperties(schema, [prop], function(err) {
  prompt.get(schema, function(err, obj){
    if (local) {
      var name = schema.name;
    } else {
      // repo
      var repo = schema.repo.split('/');
      if (2 != repo.length) throw new Error('repo must be <username>/<project>');

      // name
      var name = repo[1];
    }

    // populate json
    conf.name = obj.name = name;
    if (!local) conf.repo = repo.join('/');
    conf.description = obj.desc;
    if (!local) conf.version = "0.0.1";
    if (!local) conf.keywords = [];
    conf.dependencies = {};
    conf.development = {};
    if (!local) conf.license = "MIT";

    // dir
    console.log();
    utils.log('create', dir);
    mkdir(dir);

    // js
    if (bool(obj.js)) {
      conf.main = "index.js";
      conf.scripts = ["index.js"];
      write(join(dir, 'index.js'), '');
    }

    // html
    if (bool(obj.html)) {
      conf.templates = ['template.html'];
      write(join(dir, 'template.html'), '');
    }

    // css
    if (bool(obj.css)) {
      conf.styles = [name + '.css'];
      write(join(dir, name + '.css'), '');
    }

    // makefile
    if (!local) write(join(dir, 'Makefile'), createMakefile(obj));

    // readme
    obj.year = new Date().getUTCFullYear().toString();
    if (!local) write(join(dir, 'Readme.md'), readme(obj));

    // changelog
    if (!local) write(join(dir, 'History.md'), '');

    // .gitignore
    if (!local) write(join(dir, '.gitignore'), 'components\nbuild\n');

    // write component.json
    write(join(dir, 'component.json'), JSON.stringify(conf, null, 2));

    console.log();
    process.exit();
  });
});


/**
 * Boolean from `str`.
*/ 

function bool(str) {
  return /^y(es)?/i.test(str);
}

/**
 * Create a makefile.
 */

function createMakefile(obj) {
  var buf = '\n';

  // build target
  buf += 'build: components';
  if (bool(obj.js)) buf += ' index.js';
  if (bool(obj.css)) buf += ' ' + obj.name + '.css';
  if (bool(obj.html)) buf += ' template.js';
  buf += '\n\t@component build --dev\n\n';

  // template.js target
  if (bool(obj.html)) {
    buf += 'template.js: template.html\n';
    buf += '\t@component convert $<\n\n';
  }

  // components target
  buf += 'components: component.json\n';
  buf += '\t@component install --dev\n\n';

  // clean phony
  buf += 'clean:\n';
  buf += '\trm -fr build components template.js\n\n';

  // PHONY
  buf += '.PHONY: clean\n';

  return buf;
}
